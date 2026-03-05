"""
ASR Module - Speech-to-Text using faster-whisper (CTranslate2)
Works on Python 3.10-3.14, CPU and GPU
"""
import numpy as np
import logging
from typing import Optional, Union
from pathlib import Path

from .config import config, get_whisper_code

logger = logging.getLogger(__name__)

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False
    logger.warning("faster-whisper not installed. Run: pip install faster-whisper")


class ASRModule:
    """Speech-to-Text using faster-whisper (CTranslate2 backend)"""

    _instance = None
    _model = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.model_size = config.whisper_model_size
            self.device = config.whisper_device
            self.compute_type = config.whisper_compute_type
            self._load_model()
            ASRModule._initialized = True

    def _load_model(self):
        if not FASTER_WHISPER_AVAILABLE:
            raise ImportError("faster-whisper not installed. Run: pip install faster-whisper")

        logger.info(f"Loading Whisper '{self.model_size}' on {self.device} ({self.compute_type})...")
        self._model = WhisperModel(
            self.model_size,
            device=self.device,
            compute_type=self.compute_type,
        )
        logger.info("Whisper model loaded successfully")

    def transcribe(
        self,
        audio: Union[str, Path, np.ndarray],
        language: Optional[str] = None,
        **kwargs,
    ) -> dict:
        """
        Transcribe audio to text.

        Args:
            audio: File path or numpy float32 array (16 kHz mono)
            language: Language name or ISO code (None = auto-detect)

        Returns:
            dict with 'text', 'language', 'segments'
        """
        # Resolve language
        lang_code = None
        if language:
            lang_code = get_whisper_code(language) if len(language) > 2 else language

        # Convert path
        if isinstance(audio, Path):
            audio = str(audio)

        segments_iter, info = self._model.transcribe(
            audio,
            language=lang_code,
            beam_size=kwargs.pop('beam_size', config.whisper_beam_size),
            vad_filter=kwargs.pop('vad_filter', False),
            condition_on_previous_text=False,
            without_timestamps=True,
            **kwargs,
        )

        segments = []
        full_text_parts = []
        for seg in segments_iter:
            segments.append({
                "start": seg.start,
                "end": seg.end,
                "text": seg.text.strip(),
            })
            full_text_parts.append(seg.text.strip())

        return {
            "text": " ".join(full_text_parts),
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration,
            "segments": segments,
        }

    def transcribe_fast(
        self,
        audio: Union[str, Path, np.ndarray],
        language: Optional[str] = None,
    ) -> dict:
        """Fast transcription optimized for real-time (beam=1, no VAD, no timestamps)."""
        lang_code = None
        if language:
            lang_code = get_whisper_code(language) if len(language) > 2 else language
        if isinstance(audio, Path):
            audio = str(audio)

        segments_iter, info = self._model.transcribe(
            audio,
            language=lang_code,
            beam_size=1,
            vad_filter=False,
            condition_on_previous_text=False,
            without_timestamps=True,
        )

        parts = [seg.text.strip() for seg in segments_iter if seg.text]
        return {
            "text": " ".join(parts),
            "language": info.language,
            "language_probability": info.language_probability,
        }

    def transcribe_chunk(
        self,
        audio_chunk: Union[np.ndarray, bytes],
        language: Optional[str] = None,
    ) -> str:
        """Transcribe a short audio chunk. Returns text string."""
        if isinstance(audio_chunk, bytes):
            audio_chunk = np.frombuffer(audio_chunk, dtype=np.int16).astype(np.float32) / 32768.0

        if isinstance(audio_chunk, np.ndarray) and audio_chunk.dtype != np.float32:
            audio_chunk = audio_chunk.astype(np.float32)

        result = self.transcribe_fast(audio_chunk, language=language)
        return result["text"]

    def get_model_info(self) -> dict:
        return {
            "model_size": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "initialized": self._initialized,
        }

    @staticmethod
    def is_available() -> bool:
        return FASTER_WHISPER_AVAILABLE


def transcribe_audio(audio_path: str, language: Optional[str] = None) -> str:
    """Quick transcription helper"""
    asr = ASRModule()
    result = asr.transcribe(audio_path, language=language)
    return result["text"]
