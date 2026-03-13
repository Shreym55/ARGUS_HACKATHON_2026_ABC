from __future__ import annotations

import json
import time
import logging
from typing import Any, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("app.llm")
TModel = TypeVar("TModel", bound=BaseModel)


class LLMClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        if self.settings.ai_disable_llm:
            self._disable_reason = "ai_disable_llm_true"
        elif not self.settings.openai_api_key:
            self._disable_reason = "missing_openai_api_key"
        else:
            self._disable_reason = None

        self._enabled = self._disable_reason is None
        self._client = (
            OpenAI(api_key=self.settings.openai_api_key, timeout=self.settings.openai_timeout_seconds)
            if self._enabled
            else None
        )
        logger.info(
            "llm_client_init",
            extra={
                "event": "llm_client_init",
                "enabled": self._enabled,
                "model": self.settings.openai_model,
                "disable_reason": self._disable_reason,
            },
        )

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def disable_reason(self) -> str | None:
        return self._disable_reason

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

        schema_name = schema.__name__
        payload_size = len(json.dumps(user_payload, default=str))
        start = time.perf_counter()

        logger.debug(
            "llm_call_start",
            extra={
                "event": "llm_call_start",
                "schema": schema_name,
                "model": self.settings.openai_model,
                "payload_bytes": payload_size,
            },
        )

        try:
            response = self._client.chat.completions.create(
                model=self.settings.openai_model,
                temperature=temperature if temperature is not None else self.settings.openai_temperature,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(user_payload, ensure_ascii=True)},
                ],
            )

            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
            usage = response.usage
            raw = response.choices[0].message.content or "{}"

            logger.info(
                "llm_call_success",
                extra={
                    "event": "llm_call_success",
                    "schema": schema_name,
                    "model": self.settings.openai_model,
                    "elapsed_ms": elapsed_ms,
                    "prompt_tokens": usage.prompt_tokens if usage else None,
                    "completion_tokens": usage.completion_tokens if usage else None,
                    "total_tokens": usage.total_tokens if usage else None,
                    "response_bytes": len(raw),
                },
            )

            try:
                result = schema.model_validate_json(raw)
                logger.debug(
                    "llm_schema_validated",
                    extra={"event": "llm_schema_validated", "schema": schema_name},
                )
                return result
            except ValidationError as exc:
                logger.error(
                    "llm_schema_validation_failed",
                    extra={
                        "event": "llm_schema_validation_failed",
                        "schema": schema_name,
                        "raw_response": raw[:500],
                        "error": str(exc),
                    },
                )
                raise

        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
            logger.error(
                "llm_call_error",
                extra={
                    "event": "llm_call_error",
                    "schema": schema_name,
                    "elapsed_ms": elapsed_ms,
                    "error": str(exc),
                },
                exc_info=True,
            )
            raise


llm_client = LLMClient()
