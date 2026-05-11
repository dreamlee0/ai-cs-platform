"""Knowledge base service with vector search."""

import os
import json
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.config import settings
from app.models.knowledge import KnowledgeArticle, FAQ, KnowledgeCategory
from loguru import logger


class KnowledgeService:
    """Knowledge base service with vector similarity search."""

    def __init__(self):
        self._model = None
        self.dimension = settings.EMBEDDING_DIMENSION
        self.index = None
        self.article_ids: List[int] = []
        self.index_path = os.path.join(settings.VECTOR_STORE_DIR, "faiss.index")
        self.ids_path = os.path.join(settings.VECTOR_STORE_DIR, "article_ids.json")
        self._faiss = None
        os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)

    @property
    def model(self):
        """Lazy load sentence transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
                logger.info(f"Loaded embedding model: {settings.EMBEDDING_MODEL}")
            except Exception as e:
                logger.warning(f"Failed to load embedding model: {e}")
                return None
        return self._model

    @property
    def faiss(self):
        """Lazy load faiss."""
        if self._faiss is None:
            import faiss
            self._faiss = faiss
        return self._faiss

    def _load_index(self):
        """Load or create FAISS index."""
        if os.path.exists(self.index_path) and os.path.exists(self.ids_path):
            self.index = self.faiss.read_index(self.index_path)
            with open(self.ids_path, "r") as f:
                self.article_ids = json.load(f)
            logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
        else:
            self.index = self.faiss.IndexFlatIP(self.dimension)
            self.article_ids = []
            logger.info("Created new FAISS index")

    def _save_index(self):
        """Save FAISS index to disk."""
        self.faiss.write_index(self.index, self.index_path)
        with open(self.ids_path, "w") as f:
            json.dump(self.article_ids, f)

    def _embed_text(self, text: str) -> Optional[np.ndarray]:
        """Generate embedding for text."""
        if self.model is None:
            return None
        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.astype("float32")

    def _embed_batch(self, texts: List[str]) -> Optional[np.ndarray]:
        """Generate embeddings for a batch of texts."""
        if self.model is None:
            return None
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings.astype("float32")

    async def build_index(self, db: AsyncSession):
        """Build vector index from all knowledge articles."""
        if self.model is None:
            logger.warning("Embedding model not available, skipping index build")
            return

        self._load_index()

        result = await db.execute(
            select(KnowledgeArticle).where(KnowledgeArticle.status == "published")
        )
        articles = result.scalars().all()

        if not articles:
            logger.warning("No published articles found for indexing")
            return

        texts = []
        ids = []
        for article in articles:
            text = f"{article.title}\n{article.content}"
            if article.keywords:
                text += f"\n关键词：{article.keywords}"
            texts.append(text)
            ids.append(article.id)

        logger.info(f"Indexing {len(texts)} articles...")
        embeddings = self._embed_batch(texts)
        if embeddings is None:
            return

        self.index = self.faiss.IndexFlatIP(self.dimension)
        self.index.add(embeddings)
        self.article_ids = ids
        self._save_index()
        logger.info(f"Index built with {len(texts)} articles")

    async def search(
        self, query: str, top_k: int = None
    ) -> List[Dict]:
        """Search knowledge base for similar articles."""
        if self.model is None:
            return []

        if self.index is None:
            self._load_index()

        if self.index.ntotal == 0:
            return []

        top_k = top_k or settings.TOP_K_RESULTS
        query_embedding = self._embed_text(query)
        if query_embedding is None:
            return []
        query_embedding = query_embedding.reshape(1, -1)

        scores, indices = self.index.search(query_embedding, min(top_k, self.index.ntotal))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.article_ids):
                continue
            results.append({
                "article_id": self.article_ids[idx],
                "score": float(score),
            })

        return results

    async def get_article(self, db: AsyncSession, article_id: int) -> Optional[KnowledgeArticle]:
        """Get article by ID."""
        result = await db.execute(
            select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
        )
        return result.scalar_one_or_none()

    async def search_with_content(
        self, db: AsyncSession, query: str, top_k: int = None
    ) -> List[Dict]:
        """Search and return full article content."""
        results = await self.search(query, top_k)
        enriched = []
        for r in results:
            article = await self.get_article(db, r["article_id"])
            if article:
                enriched.append({
                    "article_id": article.id,
                    "title": article.title,
                    "content": article.content,
                    "summary": article.summary,
                    "score": r["score"],
                })
        return enriched

    async def search_faq(
        self, db: AsyncSession, query: str, top_k: int = 3
    ) -> List[FAQ]:
        """Search FAQs by keyword matching."""
        keywords = list(query)
        conditions = [
            FAQ.question.contains(kw) for kw in keywords[:5]
        ]
        result = await db.execute(
            select(FAQ)
            .where(FAQ.is_active == True)
            .where(or_(*conditions))
            .order_by(FAQ.priority.desc(), FAQ.hit_count.desc())
            .limit(top_k)
        )
        return result.scalars().all()

    async def add_article(
        self, db: AsyncSession, title: str, content: str, **kwargs
    ) -> KnowledgeArticle:
        """Add a new knowledge article."""
        article = KnowledgeArticle(
            title=title,
            content=content,
            summary=kwargs.get("summary"),
            keywords=kwargs.get("keywords"),
            category_id=kwargs.get("category_id"),
            source_type=kwargs.get("source_type", "manual"),
            created_by=kwargs.get("created_by"),
        )
        db.add(article)
        await db.flush()
        return article

    async def update_article(self, db: AsyncSession, article_id: int, **kwargs) -> Optional[KnowledgeArticle]:
        """Update an existing article."""
        article = await self.get_article(db, article_id)
        if not article:
            return None
        for key, value in kwargs.items():
            if hasattr(article, key) and value is not None:
                setattr(article, key, value)
        await db.flush()
        return article


# Singleton instance
knowledge_service = KnowledgeService()
