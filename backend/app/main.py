"""Main application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import auth, chat, knowledge, admin
from app.websocket.chat_ws import chat_websocket, agent_websocket
from loguru import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    logger.info("Database initialized")

    # Create default admin if not exists
    await create_default_admin()

    yield

    # Shutdown
    logger.info("Application shutting down")


async def create_default_admin():
    """Create default admin user if none exists."""
    from app.core.database import AsyncSessionLocal
    from app.models.user import User, UserRole
    from app.core.security import get_password_hash
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN.value))
        admin = result.scalar_one_or_none()

        if not admin:
            default_admin = User(
                username="admin",
                hashed_password=get_password_hash("admin123"),
                email="admin@example.com",
                full_name="System Admin",
                role=UserRole.ADMIN.value,
            )
            db.add(default_admin)
            await db.commit()
            logger.info("Default admin created: admin/admin123")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(chat.router, prefix=settings.API_PREFIX)
app.include_router(knowledge.router, prefix=settings.API_PREFIX)
app.include_router(admin.router, prefix=settings.API_PREFIX)

# WebSocket Routes
app.add_api_websocket_route("/ws/chat/{session_id}", chat_websocket)
app.add_api_websocket_route("/ws/agent", agent_websocket)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
