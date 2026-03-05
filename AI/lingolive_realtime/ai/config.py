"""
Configuration for LingoLive AI Speech Translation System
Supports 14 Indian languages + international languages
"""
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ModelConfig:
    """Model configuration - works on CPU and GPU"""

    # ASR (faster-whisper)
    whisper_model_size: str = "tiny"          # tiny for real-time (<0.5s), base/small for accuracy
    whisper_compute_type: str = "int8"        # int8 for speed, float16 for GPU
    whisper_device: str = "cpu"               # cpu or cuda
    whisper_beam_size: int = 1                # 1 for real-time speed, 5 for accuracy

    # TTS (edge-tts)
    tts_sample_rate: int = 24000
    audio_sample_rate: int = 16000            # Whisper expects 16kHz

    # Translation
    translation_max_length: int = 128         # shorter = faster generation

    # Pipeline tuning
    vad_min_chunk_ms: int = 200               # Lower = faster response (was 500)
    vad_max_chunk_ms: int = 600               # Lower = faster response (was 1000)


# ── Supported Languages ──────────────────────────────────────────────────────
SUPPORTED_LANGUAGES: Dict[str, str] = {
    "english":    "eng_Latn",
    "hindi":      "hin_Deva",
    "bengali":    "ben_Beng",
    "tamil":      "tam_Tamil",
    "telugu":     "tel_Telu",
    "marathi":    "mar_Deva",
    "gujarati":   "guj_Gujr",
    "kannada":    "kan_Knda",
    "malayalam":  "mal_Mlym",
    "punjabi":    "pan_Guru",
    "odia":       "ory_Orya",
    "assamese":   "asm_Beng",
    "urdu":       "urd_Arab",
    "sanskrit":   "san_Deva",
}

LANGUAGE_CODE_TO_NAME: Dict[str, str] = {v: k for k, v in SUPPORTED_LANGUAGES.items()}

# Whisper ISO-639-1 codes
WHISPER_LANG_CODES: Dict[str, str] = {
    "english": "en", "hindi": "hi", "bengali": "bn", "tamil": "ta",
    "telugu": "te", "marathi": "mr", "gujarati": "gu", "kannada": "kn",
    "malayalam": "ml", "punjabi": "pa", "urdu": "ur", "odia": "or",
    "assamese": "as", "sanskrit": "sa",
}

# Edge-TTS voice map  (high-quality Neural voices for Indian languages)
EDGE_TTS_VOICES: Dict[str, str] = {
    "english":    "en-US-AriaNeural",
    "hindi":      "hi-IN-SwaraNeural",
    "bengali":    "bn-IN-TanishaaNeural",
    "tamil":      "ta-IN-PallaviNeural",
    "telugu":     "te-IN-ShrutiNeural",
    "marathi":    "mr-IN-AarohiNeural",
    "gujarati":   "gu-IN-DhwaniNeural",
    "kannada":    "kn-IN-SapnaNeural",
    "malayalam":  "ml-IN-SobhanaNeural",
    "punjabi":    "pa-IN-GurpreetNeural",
    "urdu":       "ur-PK-UzmaNeural",
    "odia":       "or-IN-SubhasiniNeural",
    "assamese":   "as-IN-PriyomNeural",
    "sanskrit":   "hi-IN-SwaraNeural",        # Fallback to Hindi
}

# gTTS language codes (fallback)
GTTS_LANG_CODES: Dict[str, str] = {
    "english": "en", "hindi": "hi", "bengali": "bn", "tamil": "ta",
    "telugu": "te", "marathi": "mr", "gujarati": "gu", "kannada": "kn",
    "malayalam": "ml", "punjabi": "pa", "urdu": "ur",
}

# Helsinki-NLP translation model pairs
MARIAN_MODELS: Dict[str, str] = {
    "en->hi": "Helsinki-NLP/opus-mt-en-hi",
    "hi->en": "Helsinki-NLP/opus-mt-hi-en",
    "en->ur": "Helsinki-NLP/opus-mt-en-ur",
    "ur->en": "Helsinki-NLP/opus-mt-ur-en",
    "en->es": "Helsinki-NLP/opus-mt-en-es",
    "es->en": "Helsinki-NLP/opus-mt-es-en",
    "en->fr": "Helsinki-NLP/opus-mt-en-fr",
    "fr->en": "Helsinki-NLP/opus-mt-fr-en",
    "en->de": "Helsinki-NLP/opus-mt-en-de",
    "de->en": "Helsinki-NLP/opus-mt-de-en",
    "en->ru": "Helsinki-NLP/opus-mt-en-ru",
    "ru->en": "Helsinki-NLP/opus-mt-ru-en",
    "en->zh": "Helsinki-NLP/opus-mt-en-zh",
    "zh->en": "Helsinki-NLP/opus-mt-zh-en",
    "en->ja": "Helsinki-NLP/opus-mt-en-jap",
    "en->ko": "Helsinki-NLP/opus-mt-en-ko",
    "en->ar": "Helsinki-NLP/opus-mt-en-ar",
    "ar->en": "Helsinki-NLP/opus-mt-ar-en",
    "en->bn": "Helsinki-NLP/opus-mt-en-mul",
    "en->ta": "Helsinki-NLP/opus-mt-en-dra",
    "en->te": "Helsinki-NLP/opus-mt-en-dra",
    "en->ml": "Helsinki-NLP/opus-mt-en-dra",
    "en->kn": "Helsinki-NLP/opus-mt-en-dra",
    "en->mr": "Helsinki-NLP/opus-mt-en-mul",
    "en->gu": "Helsinki-NLP/opus-mt-en-mul",
}


def get_language_list() -> List[str]:
    return list(SUPPORTED_LANGUAGES.keys())


def get_language_code(language_name: str) -> str:
    return SUPPORTED_LANGUAGES.get(language_name.lower(), "eng_Latn")


def get_whisper_code(language_name: str) -> str:
    return WHISPER_LANG_CODES.get(language_name.lower(), "en")


def get_edge_voice(language_name: str) -> str:
    return EDGE_TTS_VOICES.get(language_name.lower(), "en-US-AriaNeural")


def get_gtts_code(language_name: str) -> str:
    return GTTS_LANG_CODES.get(language_name.lower(), "en")


# Global config instance
config = ModelConfig()
