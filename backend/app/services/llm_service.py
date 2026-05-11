"""LLM integration service supporting multiple providers."""

from typing import List, Dict, Optional, AsyncGenerator
from openai import AsyncOpenAI
from app.core.config import settings
from loguru import logger

# 智谱AI专用客户端
_zhipu_client = None


def _get_zhipu_client():
    """Get or create Zhipu AI client."""
    global _zhipu_client
    if _zhipu_client is None:
        try:
            from zhipuai import ZhipuAI
            _zhipu_client = ZhipuAI(api_key=settings.LLM_API_KEY)
        except ImportError:
            logger.warning("zhipuai package not installed, falling back to OpenAI-compatible mode")
            return None
    return _zhipu_client


class LLMService:
    """Unified LLM service supporting OpenAI-compatible APIs."""

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        # 智谱AI使用OpenAI兼容接口
        if self.provider == "zhipu":
            self.client = AsyncOpenAI(
                api_key=settings.LLM_API_KEY,
                base_url="https://open.bigmodel.cn/api/paas/v4",
            )
        else:
            self.client = AsyncOpenAI(
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_API_BASE,
            )
        self.model = settings.LLM_MODEL
        self.temperature = settings.LLM_TEMPERATURE
        self.max_tokens = settings.LLM_MAX_TOKENS

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stream: bool = False,
    ) -> str | AsyncGenerator[str, None]:
        """Send chat completion request to LLM."""
        try:
            if stream:
                return self._stream_chat(messages, temperature, max_tokens)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
            )
            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"LLM API error: {e}")
            raise

    async def _stream_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response from LLM."""
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature or self.temperature,
                max_tokens=max_tokens or self.max_tokens,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            logger.error(f"LLM streaming error: {e}")
            raise

    async def analyze_intent(self, text: str) -> Dict:
        """Analyze user intent from text."""
        messages = [
            {"role": "system", "content": """分析用户消息的意图，返回JSON格式：
{
    "intent": "意图类别(咨询/投诉/购买/退换货/其他)",
    "confidence": 0.0-1.0,
    "keywords": ["关键词列表"],
    "requires_human": true/false
}"""},
            {"role": "user", "content": text},
        ]

        response = await self.chat(messages, temperature=0.3, max_tokens=200)
        try:
            import json
            return json.loads(response)
        except Exception:
            return {
                "intent": "其他",
                "confidence": 0.5,
                "keywords": [],
                "requires_human": False,
            }

    async def analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of text, returns score from -1 to 1."""
        messages = [
            {"role": "system", "content": """分析用户消息的情感倾向。
返回一个浮点数，范围-1到1：
- -1表示非常负面
- 0表示中性
- 1表示非常正面
只返回数字，不要其他内容。"""},
            {"role": "user", "content": text},
        ]

        response = await self.chat(messages, temperature=0.1, max_tokens=10)
        try:
            return float(response.strip())
        except ValueError:
            return 0.0

    async def summarize_conversation(self, messages: List[Dict[str, str]]) -> str:
        """Generate a summary of the conversation."""
        conversation_text = "\n".join(
            f"{m['role']}: {m['content']}" for m in messages[-20:]
        )
        prompt = [
            {"role": "system", "content": "请用一两句话总结以下对话的主要内容和结果。"},
            {"role": "user", "content": conversation_text},
        ]
        return await self.chat(prompt, temperature=0.3, max_tokens=200)


# Singleton instance
llm_service = LLMService()
