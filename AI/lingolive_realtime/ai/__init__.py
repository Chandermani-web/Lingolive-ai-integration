"""
LingoLive AI - Speech-to-Speech Translation System
Modules: ASR (faster-whisper), Translation (MarianMT), TTS (Edge-TTS)
"""

__version__ = "2.0.0"
__author__ = "Amit"

from .config import (
    config,
    SUPPORTED_LANGUAGES,
    get_language_list,
    get_language_code,
    get_whisper_code,
    get_edge_voice,
    get_gtts_code,
)
from .asr_module import ASRModule, transcribe_audio
from .translation_module import TranslationModule, translate_text
from .tts_module import TTSModule, text_to_speech
from .speech_pipeline import SpeechToSpeechPipeline, translate_speech

__all__ = [
    "SpeechToSpeechPipeline",
    "translate_speech",
    "ASRModule",
    "transcribe_audio",
    "TranslationModule",
    "translate_text",
    "TTSModule",
    "text_to_speech",
    "config",
    "SUPPORTED_LANGUAGES",
    "get_language_list",
    "get_language_code",
    "get_whisper_code",
    "get_edge_voice",
    "get_gtts_code",
]
