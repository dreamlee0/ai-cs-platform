"""Application configuration."""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    APP_NAME: str = "AI Customer Service Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/app.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = False

    # JWT Auth
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # LLM Configuration
    LLM_PROVIDER: str = "openai"  # openai, zhipu, qwen, ollama
    LLM_API_KEY: str = ""
    LLM_API_BASE: str = "https://api.openai.com/v1"
    LLM_MODEL: str = "gpt-3.5-turbo"
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2048

    # Embedding Model
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    # Knowledge Base
    KNOWLEDGE_BASE_DIR: str = "./knowledge_base"
    VECTOR_STORE_DIR: str = "./data/vector_store"
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 3

    # Conversation
    MAX_HISTORY_LENGTH: int = 20
    SYSTEM_PROMPT: str = """你是一个专业的AI智能客服助手。请根据知识库中的信息，礼貌、准确地回答用户的问题。
如果无法从知识库中找到答案，请如实告知并建议用户联系人工客服。
回答要求：
1. 语言简洁明了
2. 态度友好专业
3. 如不确定，不要编造信息"""

    # Transfer to Human
    TRANSFER_KEYWORDS: str = "人工客服,转人工,人工,客服,投诉"
    AUTO_TRANSFER_SENTIMENT_THRESHOLD: float = -0.5

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
