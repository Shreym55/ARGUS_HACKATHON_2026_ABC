from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = Field(default="grantflow-ai-runtime", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    openai_timeout_seconds: int = Field(default=45, alias="OPENAI_TIMEOUT_SECONDS")
    openai_temperature: float = Field(default=0.1, alias="OPENAI_TEMPERATURE")
    ai_disable_llm: bool = Field(default=False, alias="AI_DISABLE_LLM")
    app_db_path: str = Field(default="/tmp/grantflow_ai_runtime.db", alias="APP_DB_PATH")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
