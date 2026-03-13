from __future__ import annotations

from functools import lru_cache
from pathlib import Path


PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"


@lru_cache(maxsize=32)
def load_prompt(name: str) -> str:
    prompt_path = PROMPT_DIR / name
    return prompt_path.read_text(encoding="utf-8")
