"""Conversation management service."""

import uuid
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.config import settings
from app.models.conversation import Conversation, Message
from app.services.llm_service import llm_service
from app.services.knowledge_service import knowledge_service
from loguru import logger


class ConversationService:
    """Manage conversations and generate AI responses."""

    def __init__(self):
        self.transfer_keywords = [
            kw.strip() for kw in settings.TRANSFER_KEYWORDS.split(",")
        ]

    async def create_conversation(
        self, db: AsyncSession, user_id: int = None, channel: str = "web"
    ) -> Conversation:
        """Create a new conversation session."""
        session_id = str(uuid.uuid4())
        conversation = Conversation(
            session_id=session_id,
            user_id=user_id,
            channel=channel,
            status="active",
        )
        db.add(conversation)
        await db.flush()

        # Add system message
        system_msg = Message(
            conversation_id=conversation.id,
            role="system",
            content=settings.SYSTEM_PROMPT,
        )
        db.add(system_msg)
        await db.flush()

        return conversation

    async def get_conversation(self, db: AsyncSession, session_id: str) -> Optional[Conversation]:
        """Get conversation by session ID."""
        result = await db.execute(
            select(Conversation).where(Conversation.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_conversation(
        self, db: AsyncSession, session_id: str = None, user_id: int = None
    ) -> Conversation:
        """Get existing or create new conversation."""
        if session_id:
            conv = await self.get_conversation(db, session_id)
            if conv:
                return conv
        return await self.create_conversation(db, user_id)

    async def add_message(
        self,
        db: AsyncSession,
        conversation_id: int,
        role: str,
        content: str,
        **kwargs,
    ) -> Message:
        """Add a message to conversation."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            message_type=kwargs.get("message_type", "text"),
            intent=kwargs.get("intent"),
            sentiment_score=kwargs.get("sentiment_score"),
            confidence=kwargs.get("confidence"),
            knowledge_base_hits=kwargs.get("knowledge_base_hits"),
            token_count=kwargs.get("token_count"),
        )
        db.add(message)
        await db.flush()
        return message

    async def get_history(
        self, db: AsyncSession, conversation_id: int, limit: int = None
    ) -> List[Message]:
        """Get conversation message history."""
        limit = limit or settings.MAX_HISTORY_LENGTH
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(limit)
        )
        return result.scalars().all()

    async def should_transfer(self, text: str, sentiment_score: float = 0.0, intent: dict = None) -> bool:
        """Check if conversation should be transferred to human agent."""
        # 明确的转人工意图短语（精确匹配，避免误触发）
        transfer_phrases = ["转人工", "人工客服", "转接人工", "找人工", "真人客服"]
        for phrase in transfer_phrases:
            if phrase in text:
                return True

        # 检查投诉意图（通过LLM意图分析判断）
        if intent and intent.get("requires_human") and intent.get("intent") == "投诉":
            return True

        # 强负面情绪自动转人工
        if sentiment_score < settings.AUTO_TRANSFER_SENTIMENT_THRESHOLD:
            return True

        return False

    async def transfer_to_agent(self, db: AsyncSession, conversation_id: int) -> None:
        """Transfer conversation to human agent."""
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.status = "transferred"
            await self.add_message(
                db, conversation_id, "system",
                "对话已转接至人工客服，请稍候..."
            )

    async def generate_response(
        self,
        db: AsyncSession,
        conversation: Conversation,
        user_message: str,
    ) -> Dict:
        """Generate AI response for user message."""
        # Analyze intent and sentiment
        intent_result = await llm_service.analyze_intent(user_message)
        sentiment_score = await llm_service.analyze_sentiment(user_message)

        # Save user message
        await self.add_message(
            db, conversation.id, "user", user_message,
            intent=intent_result.get("intent"),
            sentiment_score=sentiment_score,
            confidence=intent_result.get("confidence"),
        )

        # Check for transfer
        if await self.should_transfer(user_message, sentiment_score, intent_result):
            await self.transfer_to_agent(db, conversation.id)
            return {
                "response": "正在为您转接人工客服，请稍候...",
                "transferred": True,
                "intent": intent_result,
                "sentiment": sentiment_score,
            }

        # Search knowledge base
        kb_results = await knowledge_service.search_with_content(db, user_message)

        # Build context
        history = await self.get_history(db, conversation.id)
        messages = self._build_messages(history, kb_results, user_message)

        # Generate response
        response = await llm_service.chat(messages)

        # Save assistant message
        await self.add_message(
            db, conversation.id, "assistant", response,
            knowledge_base_hits=[r["article_id"] for r in kb_results] if kb_results else None,
        )

        return {
            "response": response,
            "transferred": False,
            "intent": intent_result,
            "sentiment": sentiment_score,
            "references": kb_results[:3] if kb_results else [],
        }

    def _build_messages(
        self,
        history: List[Message],
        kb_results: List[Dict],
        current_query: str,
    ) -> List[Dict[str, str]]:
        """Build message list for LLM API."""
        messages = []

        # System prompt with knowledge context
        system_prompt = settings.SYSTEM_PROMPT
        if kb_results:
            context = "\n\n".join([
                f"【参考{i+1}】{r['title']}\n{r['content'][:500]}"
                for i, r in enumerate(kb_results[:3])
            ])
            system_prompt += f"\n\n以下是知识库中的相关信息，请参考回答：\n{context}"

        messages.append({"role": "system", "content": system_prompt})

        # Conversation history
        for msg in history[-settings.MAX_HISTORY_LENGTH:]:
            if msg.role in ("user", "assistant"):
                messages.append({"role": msg.role, "content": msg.content})

        return messages

    async def close_conversation(
        self, db: AsyncSession, conversation_id: int, rating: int = None
    ) -> None:
        """Close a conversation."""
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.status = "closed"
            conv.closed_at = datetime.utcnow()
            if rating:
                conv.satisfaction_rating = rating

    async def get_conversations(
        self,
        db: AsyncSession,
        status: str = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict:
        """Get paginated conversation list."""
        query = select(Conversation).order_by(desc(Conversation.updated_at))
        if status:
            query = query.where(Conversation.status == status)

        # Count total
        count_query = select(func.count(Conversation.id))
        if status:
            count_query = count_query.where(Conversation.status == status)
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        conversations = result.scalars().all()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": conversations,
        }


# Singleton instance
conversation_service = ConversationService()
