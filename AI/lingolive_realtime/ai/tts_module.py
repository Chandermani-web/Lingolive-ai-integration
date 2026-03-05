"""
TTS Module - Text-to-Speech using Edge-TTS (Microsoft Neural Voices)
Free, high-quality, supports 14+ Indian languages
Falls back to gTTS if edge-tts fails
"""
import asyncio
import io
import logging
import tempfile
from pathlib import Path
from typing import Optional, Union

import numpy as np
import soundfile as sf

from .config import config, get_edge_voice, get_gtts_code

logger = logging.getLogger(__name__)

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    logger.warning("edge-tts not installed. Run: pip install edge-tts")

try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    GTTS_AVAILABLE = False


class TTSModule:
    """
    Text-to-Speech using Microsoft Edge-TTS (Neural voices).
    - Free, no API key needed
    - Supports Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada,
      Malayalam, Punjabi, Urdu, English, and more
    - Falls back to gTTS (Google) if edge-tts is unavailable
    """

    _instance = None
    _initialized = False

    def __new__(cls, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, **kwargs):
        if not self._initialized:
            self.sample_rate = config.tts_sample_rate
            if not EDGE_TTS_AVAILABLE and not GTTS_AVAILABLE:
                raise ImportError(
                    "No TTS engine found. Install: pip install edge-tts  (or)  pip install gtts"
                )
            self.engine = "edge-tts" if EDGE_TTS_AVAILABLE else "gtts"
            logger.info(f"TTSModule ready (engine={self.engine})")
            TTSModule._initialized = True

    # ── public API ──────────────────────────────────────────────────────────

    def synthesize(
        self,
        text: str,
        language: str = "english",
        **kwargs,
    ) -> np.ndarray:
        """
        Convert text to audio waveform.

        Args:
            text: Text to speak
            language: Language name (e.g. 'hindi')

        Returns:
            numpy float32 array (mono, 24 kHz)
        """
        if not text or not text.strip():
            return np.array([], dtype=np.float32)

        if self.engine == "edge-tts":
            return self._synthesize_edge(text.strip(), language)
        else:
            return self._synthesize_gtts(text.strip(), language)

    def synthesize_to_file(
        self,
        text: str,
        output_path: Union[str, Path],
        language: str = "english",
        **kwargs,
    ) -> Path:
        """Synthesize and save to WAV file"""
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        wav = self.synthesize(text, language=language, **kwargs)
        sf.write(str(output_path), wav, self.sample_rate)
        logger.info(f"Audio saved to {output_path}")
        return output_path

    async def synthesize_stream(self, text: str, language: str = "english"):
        """Async generator yielding raw PCM bytes (for real-time streaming)"""
        voice = get_edge_voice(language)
        if not EDGE_TTS_AVAILABLE:
            return
        communicate = edge_tts.Communicate(text=text, voice=voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio" and chunk.get("data"):
                yield chunk["data"]

    def get_model_info(self) -> dict:
        return {
            "model_name": f"TTSModule ({self.engine})",
            "engine": self.engine,
            "device": "cpu",
            "sample_rate": self.sample_rate,
            "initialized": self._initialized,
            "edge_tts_available": EDGE_TTS_AVAILABLE,
            "gtts_available": GTTS_AVAILABLE,
        }

    @staticmethod
    def is_available() -> bool:
        return EDGE_TTS_AVAILABLE or GTTS_AVAILABLE

    # ── internals ───────────────────────────────────────────────────────────

    def _synthesize_edge(self, text: str, language: str) -> np.ndarray:
        """Synthesize via Edge-TTS — fast in-memory processing, no temp files."""
        voice = get_edge_voice(language)

        async def _run_edge():
            communicate = edge_tts.Communicate(text=text, voice=voice)
            audio_chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio" and chunk.get("data"):
                    audio_chunks.append(chunk["data"])
            return b"".join(audio_chunks)

        try:
            # Get raw audio bytes without writing to disk
            try:
                loop = asyncio.get_running_loop()
                # Inside async context — run in thread to avoid blocking
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    import threading
                    result_holder: list = [None]
                    exc_holder: list = [None]
                    ready = threading.Event()

                    def _run():
                        try:
                            result_holder[0] = asyncio.run(_run_edge())
                        except Exception as e:
                            exc_holder[0] = e
                        finally:
                            ready.set()

                    t = threading.Thread(target=_run, daemon=True)
                    t.start()
                    t.join(timeout=10)
                    if exc_holder[0]:
                        raise exc_holder[0]
                    mp3_bytes = result_holder[0]
            except RuntimeError:
                # No running loop — safe to use asyncio.run directly
                mp3_bytes = asyncio.run(_run_edge())

            if not mp3_bytes:
                raise RuntimeError("Edge-TTS returned no audio data")

            # Decode MP3 from memory (no disk I/O)
            audio, sr = sf.read(io.BytesIO(mp3_bytes))
            if audio.ndim > 1:
                audio = audio.mean(axis=-1)
            audio = audio.astype(np.float32)
            if np.abs(audio).max() > 0:
                audio = audio / np.abs(audio).max()
            return audio

        except Exception as e:
            logger.warning(f"Edge-TTS failed ({e}), falling back to gTTS")
            if GTTS_AVAILABLE:
                return self._synthesize_gtts(text, language)
            raise

    def _synthesize_gtts(self, text: str, language: str) -> np.ndarray:
        """Fallback: synthesize via gTTS"""
        lang_code = get_gtts_code(language)
        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp_path = tmp.name
        tmp.close()

        try:
            tts = gTTS(text=text, lang=lang_code, slow=False)
            tts.save(tmp_path)
            audio, sr = sf.read(tmp_path)
            if audio.ndim > 1:
                audio = audio.mean(axis=-1)
            audio = audio.astype(np.float32)
            if np.abs(audio).max() > 0:
                audio = audio / np.abs(audio).max()
            return audio
        finally:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass


def text_to_speech(text: str, output_path: str, language: str = "english") -> str:
    """Quick helper"""
    tts = TTSModule()
    result = tts.synthesize_to_file(text, output_path, language=language)
    return str(result)
