from openai import OpenAI

from app.config import Settings


def build_client(settings: Settings) -> OpenAI:
    """Build an OpenAI-SDK client pointed at whichever provider is configured.

    DeepSeek, Groq, OpenRouter, Together, Moonshot, a local Ollama server, and
    Azure/self-hosted gateways are all Chat-Completions-compatible, so a
    single SDK covers every provider in PROVIDER_DEFAULTS — only api_key and
    base_url change. See backend/.env.example for the full provider list.
    """
    return OpenAI(api_key=settings.llm_api_key, base_url=settings.resolved_base_url)


def completion_token_kwargs(settings: Settings, max_tokens: int) -> dict[str, int]:
    """Return the right token-limit kwarg name for the configured provider.

    OpenAI's reasoning-tuned models (o1/o3/gpt-5 family) require
    `max_completion_tokens` and reject the older `max_tokens`. Other
    OpenAI-compatible providers (DeepSeek, Groq, OpenRouter, Together,
    Moonshot, Ollama) implement the classic `max_tokens` field and may
    reject an unrecognized `max_completion_tokens`.
    """
    key = "max_completion_tokens" if settings.llm_provider == "openai" else "max_tokens"
    return {key: max_tokens}
