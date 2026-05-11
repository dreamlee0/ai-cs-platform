"""Knowledge base management API."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.user import User
from app.models.knowledge import KnowledgeArticle, KnowledgeCategory, FAQ
from app.services.knowledge_service import knowledge_service

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])


# ----- Schemas -----

class CategoryCreate(BaseModel):
    name: str
    description: str = None
    parent_id: int = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str = None
    parent_id: int = None
    is_active: bool

    class Config:
        from_attributes = True


class ArticleCreate(BaseModel):
    title: str
    content: str
    summary: str = None
    keywords: str = None
    category_id: int = None


class ArticleUpdate(BaseModel):
    title: str = None
    content: str = None
    summary: str = None
    keywords: str = None
    category_id: int = None
    status: str = None


class ArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: str = None
    keywords: str = None
    category_id: int = None
    status: str
    view_count: int
    helpful_count: int

    class Config:
        from_attributes = True


class FAQCreate(BaseModel):
    question: str
    answer: str
    category_id: int = None
    priority: int = 0


class FAQResponse(BaseModel):
    id: int
    question: str
    answer: str
    category_id: int = None
    priority: int
    hit_count: int
    is_active: bool

    class Config:
        from_attributes = True


# ----- Categories -----

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create knowledge category (admin only)."""
    category = KnowledgeCategory(**data.model_dump())
    db.add(category)
    await db.flush()
    return category


@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all active categories."""
    result = await db.execute(
        select(KnowledgeCategory)
        .where(KnowledgeCategory.is_active == True)
        .order_by(KnowledgeCategory.sort_order)
    )
    return result.scalars().all()


# ----- Articles -----

@router.post("/articles", response_model=ArticleResponse)
async def create_article(
    data: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create a knowledge article (admin only)."""
    article = await knowledge_service.add_article(
        db, data.title, data.content,
        summary=data.summary,
        keywords=data.keywords,
        category_id=data.category_id,
        created_by=admin.id,
    )
    return article


@router.get("/articles", response_model=List[ArticleResponse])
async def list_articles(
    category_id: int = None,
    status: str = "published",
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List articles with optional filters."""
    query = select(KnowledgeArticle)
    if category_id:
        query = query.where(KnowledgeArticle.category_id == category_id)
    if status:
        query = query.where(KnowledgeArticle.status == status)
    query = query.order_by(KnowledgeArticle.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: int, db: AsyncSession = Depends(get_db)):
    """Get article by ID."""
    article = await knowledge_service.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.put("/articles/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: int,
    data: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Update article (admin only)."""
    article = await knowledge_service.update_article(
        db, article_id, **data.model_dump(exclude_unset=True)
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Delete article (admin only)."""
    article = await knowledge_service.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    await db.delete(article)
    return {"status": "deleted"}


@router.post("/articles/{article_id}/helpful")
async def mark_helpful(article_id: int, helpful: bool = True, db: AsyncSession = Depends(get_db)):
    """Mark article as helpful or not."""
    article = await knowledge_service.get_article(db, article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if helpful:
        article.helpful_count += 1
    else:
        article.not_helpful_count += 1
    return {"status": "ok"}


@router.post("/rebuild-index")
async def rebuild_index(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Rebuild vector search index (admin only)."""
    await knowledge_service.build_index(db)
    return {"status": "index rebuilt"}


@router.post("/search")
async def search_knowledge(
    query: str,
    top_k: int = 5,
    db: AsyncSession = Depends(get_db),
):
    """Search knowledge base."""
    results = await knowledge_service.search_with_content(db, query, top_k)
    return results


# ----- FAQs -----

@router.post("/faqs", response_model=FAQResponse)
async def create_faq(
    data: FAQCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    """Create FAQ (admin only)."""
    faq = FAQ(**data.model_dump())
    db.add(faq)
    await db.flush()
    return faq


@router.get("/faqs", response_model=List[FAQResponse])
async def list_faqs(
    category_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    """List active FAQs."""
    query = select(FAQ).where(FAQ.is_active == True)
    if category_id:
        query = query.where(FAQ.category_id == category_id)
    query = query.order_by(FAQ.priority.desc())
    result = await db.execute(query)
    return result.scalars().all()
