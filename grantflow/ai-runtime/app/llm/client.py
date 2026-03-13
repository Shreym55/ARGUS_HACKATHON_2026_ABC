from __future__ import annotations

import json
import logging
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
TModel = TypeVar("TModel", bound=BaseModel)


class LLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._enabled = bool(self.settings.openai_api_key) and not self.settings.ai_disable_llm
        self._client = (
            OpenAI(api_key=self.settings.openai_api_key, timeout=self.settings.openai_timeout_seconds)
            if self._enabled
            else None
        )

    @property
    def enabled(self) -> bool:
        return self._enabled

    def invoke_structured(
        self,
        schema: type[TModel],
        system_prompt: str,
        user_payload: dict[str, Any],
        *,
        temperature: float | None = None,
    ) -> TModel:
        if not self._client:
            raise RuntimeError("LLM is disabled. Provide OPENAI_API_KEY or set AI_DISABLE_LLM=false.")

        response = self._client.chat.completions.create(
            model=self.settings.openai_model,
            temperature=temperature if temperature is not None else self.settings.openai_temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=True)},
            ],
        )

        raw = response.choices[0].message.content or "{}"
        try:
            return schema.model_validate_json(raw)
        except ValidationError as exc:
            logger.error("LLM output schema validation failed: %s", exc)
            raise


llm_client = LLMClient()
