from __future__ import annotations

from typing import Dict, Optional

from loguru import logger

try:
    from transformers import MarianMTModel, MarianTokenizer  # type: ignore
except Exception:  # pragma: no cover
    MarianMTModel = None  # type: ignore
    MarianTokenizer = None  # type: ignore


LANG_PAIR_TO_MODEL: Dict[str, str] = {
    # Extend as needed
    "en->es": "Helsinki-NLP/opus-mt-en-es",
    "es->en": "Helsinki-NLP/opus-mt-es-en",
    "en->fr": "Helsinki-NLP/opus-mt-en-fr",
    "fr->en": "Helsinki-NLP/opus-mt-fr-en",
}


class Translator:
    """Chunk-level neural machine translation using MarianMT.

    Keeps tokenizer/model cached per language pair for reuse.
    """

    def __init__(self) -> None:
        self._cache: Dict[str, tuple] = {}

    def _ensure(self, src: str, tgt: str) -> Optional[tuple]:
        if MarianMTModel is None or MarianTokenizer is None:
            logger.warning("transformers MarianMT not installed; translation disabled.")
            return None
        key = f"{src}->{tgt}"
        if key not in LANG_PAIR_TO_MODEL:
            logger.warning(f"No Marian model configured for {key}; passthrough text.")
            return None
        if key not in self._cache:
            model_name = LANG_PAIR_TO_MODEL[key]
            tok = MarianTokenizer.from_pretrained(model_name)
            mdl = MarianMTModel.from_pretrained(model_name)
            self._cache[key] = (tok, mdl)
        return self._cache[key]

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        pair = self._ensure(source_lang, target_lang)
        if not text:
            return ""
        if pair is None:
            # Fallback: passthrough
            return text
        tok, mdl = pair
        batch = tok([text], return_tensors="pt", padding=True)
        out = mdl.generate(**batch, max_new_tokens=64)
        detok = tok.batch_decode(out, skip_special_tokens=True)
        return detok[0] if detok else text
