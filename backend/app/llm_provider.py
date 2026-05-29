import os
from dataclasses import dataclass
from typing import Optional


DEEPSEEK_BASE_URL = "https://api.deepseek.com"


@dataclass(frozen=True)
class LlmConfig:
    provider: str
    model: str
    api_key: Optional[str]
    base_url: Optional[str] = None


def resolve_llm_config() -> LlmConfig:
    provider = os.getenv("MODEL_PROVIDER", "openai").strip().lower()
    model_override = os.getenv("MODEL_NAME")

    if provider == "mock":
        return LlmConfig(provider="mock", model="mock", api_key=None)

    if provider == "deepseek":
        return LlmConfig(
            provider="deepseek",
            model=model_override or "deepseek-chat",
            api_key=(
                os.getenv("DEEPSEEK_API_KEY")
                or os.getenv("DEEPSEEK_API")
                or os.getenv("DEEPSEEK_TOKEN")
                or os.getenv("DEEPSEEK_KEY")
                or os.getenv("VITE_DEEPSEEK_API_KEY")
                or os.getenv("VITE_DEEPSEEK_API")
                or os.getenv("VITE_DEEPSEEK_TOKEN")
                or os.getenv("VITE_DEEPSEEK_KEY")
            ),
            base_url=os.getenv("DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL),
        )

    if provider == "anthropic":
        return LlmConfig(
            provider="anthropic",
            model=model_override or "claude-opus-4-6",
            api_key=os.getenv("ANTHROPIC_API_KEY"),
        )

    return LlmConfig(
        provider="openai",
        model=model_override or "gpt-4o",
        api_key=os.getenv("OPENAI_API_KEY"),
    )


def create_chat_model():
    config = resolve_llm_config()

    if config.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=config.model, api_key=config.api_key)

    from langchain_openai import ChatOpenAI

    if config.provider == "deepseek":
        if not config.api_key:
            raise ValueError("DEEPSEEK_API_KEY is required when MODEL_PROVIDER=deepseek")
        return ChatOpenAI(
            model=config.model,
            api_key=config.api_key,
            base_url=config.base_url,
        )

    return ChatOpenAI(model=config.model, api_key=config.api_key)
