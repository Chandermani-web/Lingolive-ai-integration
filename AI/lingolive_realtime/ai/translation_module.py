"""
Translation Module - Text translation using Helsinki-NLP MarianMT models
Lightweight, works on CPU, no gated access needed
Falls back to googletrans if MarianMT models are unavailable
"""
import logging
from typing import Dict, List, Optional, Tuple, Union

from .config import config, MARIAN_MODELS, WHISPER_LANG_CODES, SUPPORTED_LANGUAGES, get_language_code

logger = logging.getLogger(__name__)

# Try to import MarianMT
try:
    from transformers import MarianMTModel, MarianTokenizer
    MARIAN_AVAILABLE = True
except ImportError:
    MARIAN_AVAILABLE = False
    logger.warning("transformers not available for MarianMT")

# Try googletrans as lightweight fallback
try:
    from deep_translator import GoogleTranslator
    DEEP_TRANSLATOR_AVAILABLE = True
except ImportError:
    DEEP_TRANSLATOR_AVAILABLE = False


class TranslationModule:
    """
    Translation using Helsinki-NLP/opus-mt MarianMT models.
    - No gated repos. No HuggingFace authentication needed.
    - ~300MB per model pair.  Cached per language pair.
    - Falls back to Google Translate API if model not available.
    """

    _instance = None
    _initialized = False

    def __new__(cls, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, **kwargs):
        if not self._initialized:
            self._model_cache: Dict[str, Tuple] = {}  # "en->hi" -> (tokenizer, model)
            self._initialized = True
            logger.info("TranslationModule initialized (lazy model loading)")

    # ── public API ──────────────────────────────────────────────────────────

    def translate(
        self,
        text: Union[str, List[str]],
        source_lang: str,
        target_lang: str,
        max_length: int = 256,
    ) -> Union[str, List[str]]:
        """
        Translate text between languages.

        Args:
            text: Input text or list of texts
            source_lang: Language name (e.g. 'english') or ISO code ('en')
            target_lang: Language name or ISO code
            max_length: Max tokens in output

        Returns:
            Translated text (same type as input)
        """
        if not text:
            return "" if isinstance(text, str) else []

        is_single = isinstance(text, str)
        texts = [text] if is_single else text
        texts = [t.strip() for t in texts if t.strip()]
        if not texts:
            return "" if is_single else []

        src = self._to_iso(source_lang)
        tgt = self._to_iso(target_lang)

        if src == tgt:
            return texts[0] if is_single else texts

        translations = self._translate_batch(texts, src, tgt, max_length)
        return translations[0] if is_single else translations

    def translate_batch(
        self,
        texts: List[str],
        source_lang: str,
        target_lang: str,
        batch_size: int = 8,
        **kwargs,
    ) -> List[str]:
        if not texts:
            return []
        src = self._to_iso(source_lang)
        tgt = self._to_iso(target_lang)
        if src == tgt:
            return list(texts)

        results: List[str] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            results.extend(self._translate_batch(batch, src, tgt))
        return results

    def get_supported_languages(self) -> List[str]:
        return list(SUPPORTED_LANGUAGES.keys())

    def get_model_info(self) -> dict:
        return {
            "initialized": self._initialized,
            "marian_available": MARIAN_AVAILABLE,
            "deep_translator_available": DEEP_TRANSLATOR_AVAILABLE,
            "cached_models": list(self._model_cache.keys()),
            "supported_languages": len(SUPPORTED_LANGUAGES),
        }

    # ── internals ───────────────────────────────────────────────────────────

    def _to_iso(self, lang: str) -> str:
        """Convert language name or code to ISO-639-1 ('en', 'hi', ...)"""
        lang_lower = lang.lower().strip()
        # Already ISO?
        if len(lang_lower) <= 3 and lang_lower in WHISPER_LANG_CODES.values():
            return lang_lower
        # Known name?
        if lang_lower in WHISPER_LANG_CODES:
            return WHISPER_LANG_CODES[lang_lower]
        # 'auto' -> 'en' default
        if lang_lower == "auto":
            return "en"
        return lang_lower

    def _translate_batch(
        self, texts: List[str], src: str, tgt: str, max_length: int = 128
    ) -> List[str]:
        """Use local MarianMT as primary (fast, no network),
        fall back to Google Translate if MarianMT model is unavailable."""
        key = f"{src}->{tgt}"

        # Strategy 1: Direct MarianMT model (LOCAL = fastest, ~50ms)
        if MARIAN_AVAILABLE and key in MARIAN_MODELS:
            result = self._marian_translate(texts, key, max_length)
            if result and result != texts:
                return result

        # Strategy 2: Pivot through English (src->en, en->tgt) — still local
        if MARIAN_AVAILABLE and src != "en" and tgt != "en":
            key_to_en = f"{src}->en"
            key_from_en = f"en->{tgt}"
            if key_to_en in MARIAN_MODELS and key_from_en in MARIAN_MODELS:
                english_texts = self._marian_translate(texts, key_to_en, max_length)
                return self._marian_translate(english_texts, key_from_en, max_length)

        # Strategy 3: Google Translate (network fallback — slower but wider coverage)
        if DEEP_TRANSLATOR_AVAILABLE:
            result = self._google_translate(texts, src, tgt)
            if result and result != texts:
                return result
            logger.warning(f"Google Translate returned empty/same for {key}")

        # Strategy 4: No translation available
        logger.warning(f"No translation available for {key}. Returning original text.")
        return texts

    def _marian_translate(
        self, texts: List[str], key: str, max_length: int = 128
    ) -> List[str]:
        """Translate using MarianMT"""
        try:
            tok, mdl = self._ensure_marian(key)
            batch = tok(texts, return_tensors="pt", padding=True, truncation=True, max_length=max_length)
            output_ids = mdl.generate(**batch, max_new_tokens=max_length, num_beams=1)
            return tok.batch_decode(output_ids, skip_special_tokens=True)
        except Exception as e:
            logger.error(f"MarianMT error for {key}: {e}")
            return texts

    def _ensure_marian(self, key: str):
        """Lazy-load and cache MarianMT model"""
        if key not in self._model_cache:
            model_name = MARIAN_MODELS[key]
            logger.info(f"Loading MarianMT model: {model_name}")
            tok = MarianTokenizer.from_pretrained(model_name)
            mdl = MarianMTModel.from_pretrained(model_name)
            mdl.eval()
            self._model_cache[key] = (tok, mdl)
        return self._model_cache[key]

    def _google_translate(self, texts: List[str], src: str, tgt: str) -> List[str]:
        """Primary translation using deep-translator (Google Translate)
        Most accurate for Indian languages compared to MarianMT."""
        try:
            results = []
            translator = GoogleTranslator(source=src if src != "auto" else "auto", target=tgt)
            for text in texts:
                translated = translator.translate(text)
                if translated:
                    results.append(translated)
                    logger.debug(f"Google Translate [{src}->{tgt}]: '{text}' -> '{translated}'")
                else:
                    results.append(text)
                    logger.warning(f"Google Translate returned empty for: '{text}'")
            return results
        except Exception as e:
            logger.error(f"Google Translate error ({src}->{tgt}): {e}")
            return []  # Return empty so caller tries next strategy


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Quick helper"""
    t = TranslationModule()
    return t.translate(text, source_lang, target_lang)
