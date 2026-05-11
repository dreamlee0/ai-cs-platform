"""Admin dashboard API endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.conversation import Conversation, Message
from app.models.knowledge import KnowledgeArticle, FAQ

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get dashboard statistics."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total conversations
    total_conv = await db.execute(select(func.count(Conversation.id)))
    total_conversations = total_conv.scalar()

    # Today's conversations
    today_conv = await db.execute(
        select(func.count(Conversation.id))
        .where(Conversation.created_at >= today_start)
    )
    today_conversations = today_conv.scalar()

    # Active conversations
    active_conv = await db.execute(
        select(func.count(Conversation.id))
        .where(Conversation.status == "active")
    )
    active_conversations = active_conv.scalar()

    # Transferred conversations
    transferred_conv = await db.execute(
        select(func.count(Conversation.id))
        .where(Conversation.status == "transferred")
    )
    transferred_conversations = transferred_conv.scalar()

    # Average satisfaction
    avg_rating = await db.execute(
        select(func.avg(Conversation.satisfaction_rating))
        .where(Conversation.satisfaction_rating.isnot(None))
    )
    satisfaction = round(avg_rating.scalar() or 0, 1)

    # Total articles
    total_articles = await db.execute(select(func.count(KnowledgeArticle.id)))
    article_count = total_articles.scalar()

    # Total FAQs
    total_faqs = await db.execute(select(func.count(FAQ.id)))
    faq_count = total_faqs.scalar()

    # Total users
    total_users = await db.execute(select(func.count(User.id)))
    user_count = total_users.scalar()

    # Conversation trend (last 7 days)
    trend = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count_result = await db.execute(
            select(func.count(Conversation.id))
            .where(and_(
                Conversation.created_at >= day,
                Conversation.created_at < next_day,
            ))
        )
        trend.append({
            "date": day.strftime("%m-%d"),
            "count": count_result.scalar(),
        })

    return {
        "overview": {
            "total_conversations": total_conversations,
            "today_conversations": today_conversations,
            "active_conversations": active_conversations,
            "transferred_conversations": transferred_conversations,
            "satisfaction_rating": satisfaction,
            "total_articles": article_count,
            "total_faqs": faq_count,
            "total_users": user_count,
        },
        "trend": trend,
    }


@router.get("/conversations/active")
async def get_active_conversations(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get all active conversations for agent view."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.status.in_(["active", "transferred"]))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    items = []
    for conv in conversations:
        # Get last message
        last_msg = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        last_message = last_msg.scalar_one_or_none()

        items.append({
            "id": conv.id,
            "session_id": conv.session_id,
            "status": conv.status,
            "user_name": conv.user_name or "访客",
            "channel": conv.channel,
            "last_message": last_message.content if last_message else None,
            "last_message_time": str(last_message.created_at) if last_message else None,
            "updated_at": str(conv.updated_at),
        })

    return items


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Get conversation detail with all messages."""
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = messages_result.scalars().all()

    return {
        "conversation": {
            "id": conv.id,
            "session_id": conv.session_id,
            "status": conv.status,
            "channel": conv.channel,
            "user_name": conv.user_name,
            "user_contact": conv.user_contact,
            "satisfaction_rating": conv.satisfaction_rating,
            "created_at": str(conv.created_at),
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "intent": m.intent,
                "sentiment_score": m.sentiment_score,
                "created_at": str(m.created_at),
            }
            for m in messages
        ],
    }
