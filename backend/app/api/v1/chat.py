"""Chat API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services.conversation_service import conversation_service

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: str = None
    channel: str = "web"


class ChatResponse(BaseModel):
    response: str
    session_id: str
    transferred: bool
    intent: dict = None
    sentiment: float = None
    references: list = []


class ConversationResponse(BaseModel):
    id: int
    session_id: str
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    intent: str = None
    sentiment_score: float = None
    created_at: str

    class Config:
        from_attributes = True


@router.post("/send", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message and get AI response."""
    # Get or create conversation
    conversation = await conversation_service.get_or_create_conversation(
        db, request.session_id, current_user.id
    )

    # Generate response
    result = await conversation_service.generate_response(
        db, conversation, request.message
    )

    return ChatResponse(
        response=result["response"],
        session_id=conversation.session_id,
        transferred=result["transferred"],
        intent=result.get("intent"),
        sentiment=result.get("sentiment"),
        references=result.get("references", []),
    )


@router.post("/guest", response_model=ChatResponse)
async def guest_chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Guest chat without authentication."""
    conversation = await conversation_service.get_or_create_conversation(
        db, request.session_id
    )

    result = await conversation_service.generate_response(
        db, conversation, request.message
    )

    return ChatResponse(
        response=result["response"],
        session_id=conversation.session_id,
        transferred=result["transferred"],
        intent=result.get("intent"),
        sentiment=result.get("sentiment"),
        references=result.get("references", []),
    )


@router.get("/history/{session_id}")
async def get_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation history."""
    conversation = await conversation_service.get_conversation(db, session_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await conversation_service.get_history(db, conversation.id)
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "intent": m.intent,
            "sentiment_score": m.sentiment_score,
            "created_at": str(m.created_at),
        }
        for m in messages
        if m.role != "system"
    ]


@router.post("/close/{session_id}")
async def close_conversation(
    session_id: str,
    rating: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Close a conversation with optional rating."""
    conversation = await conversation_service.get_conversation(db, session_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await conversation_service.close_conversation(db, conversation.id, rating)
    return {"status": "closed"}


@router.get("/conversations")
async def list_conversations(
    status: str = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List conversations."""
    result = await conversation_service.get_conversations(db, status, page, page_size)
    return {
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "items": [
            {
                "id": c.id,
                "session_id": c.session_id,
                "status": c.status,
                "user_name": c.user_name,
                "satisfaction_rating": c.satisfaction_rating,
                "created_at": str(c.created_at),
                "updated_at": str(c.updated_at),
            }
            for c in result["items"]
        ],
    }
