from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Known OpenAI-compatible providers: base_url + a sane default chat model.
# DeepSeek, Groq, OpenRouter, Together, Moonshot, and a local Ollama server
# all speak the same Chat Completions wire format as OpenAI, so one SDK
# (`openai`) covers every one of them — only the base_url and model differ.
PROVIDER_DEFAULTS: dict[str, dict[str, str]] = {
    "openai": {"base_url": "https://api.openai.com/v1", "model": "gpt-4o-mini"},
    "deepseek": {"base_url": "https://api.deepseek.com", "model": "deepseek-chat"},
    "groq": {"base_url": "https://api.groq.com/openai/v1", "model": "llama-3.3-70b-versatile"},
    "openrouter": {"base_url": "https://openrouter.ai/api/v1", "model": "openai/gpt-4o-mini"},
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    },
    "moonshot": {"base_url": "https://api.moonshot.cn/v1", "model": "moonshot-v1-8k"},
    "ollama": {"base_url": "http://localhost:11434/v1", "model": "llama3.1"},
    # "custom": any other OpenAI-compatible endpoint (Azure OpenAI, LM Studio,
    # vLLM, a self-hosted gateway, ...) — requires LLM_BASE_URL to be set.
    "custom": {"base_url": "", "model": ""},
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Which provider from PROVIDER_DEFAULTS to talk to. Defaults to "openai"
    # so existing .env files (OPENAI_API_KEY/OPENAI_MODEL only) keep working.
    llm_provider: str = "openai"

    # LLM_API_KEY is the current name; OPENAI_API_KEY is still accepted so
    # .env files written before multi-provider support don't break.
    llm_api_key: str | None = Field(
        default=None, validation_alias=AliasChoices("LLM_API_KEY", "OPENAI_API_KEY")
    )
    # Same backward-compat story for the model id. Falls back to the chosen
    # provider's default model (PROVIDER_DEFAULTS) when unset.
    llm_model: str | None = Field(
        default=None, validation_alias=AliasChoices("LLM_MODEL", "OPENAI_MODEL")
    )
    # Only needed to override a known provider's default endpoint, or when
    # LLM_PROVIDER=custom (any other OpenAI-compatible endpoint).
    llm_base_url: str | None = None

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key)

    @property
    def resolved_model(self) -> str:
        return self.llm_model or PROVIDER_DEFAULTS.get(self.llm_provider, {}).get(
            "model", "gpt-4o-mini"
        )

    @property
    def resolved_base_url(self) -> str | None:
        if self.llm_base_url:
            return self.llm_base_url
        return PROVIDER_DEFAULTS.get(self.llm_provider, {}).get("base_url") or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
