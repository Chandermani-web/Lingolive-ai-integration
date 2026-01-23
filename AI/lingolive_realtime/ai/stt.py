from __future__ import annotations

import asyncio
from typing import AsyncIterator, Optional

from loguru import logger

try:
    from faster_whisper import WhisperModel  # type: ignore
except Exception:  # pragma: no cover - allow missing at dev
    WhisperModel = None  # type: ignore


class STTEngine:
    """Streaming STT using Faster-Whisper in chunked mode.

    For production, run with tiny/base models for low latency. This class accepts
    raw PCM 16k mono bytes and yields partial transcripts per chunk.
    """

    def __init__(self, model_size: str = "base", device: str = "auto") -> None:
        self.model_size = model_size
        self.device = device
        self._model: Optional[WhisperModel] = None

    def _ensure_model(self) -> None:
        if self._model is None:
            if WhisperModel is None:
                logger.warning("faster-whisper not installed; STT disabled.")
                return
            self._model = WhisperModel(self.model_size, device=self.device, compute_type="int8")

    async def transcribe_chunks(self, pcm16k_mono: AsyncIterator[bytes], source_lang: Optional[str] = None) -> AsyncIterator[str]:
        """Yield partial transcripts for each ~0.5–1.0s voiced chunk.

        Input chunks are small to minimize latency. We call model on each chunk
        with `vad_filter=False` since VAD is handled upstream.
        """
        self._ensure_model()
        if self._model is None:
            async for _ in pcm16k_mono:
                # No-op fallback: yield nothing
                await asyncio.sleep(0)  # cooperative
            return

        assert self._model is not None
        model = self._model

        async for chunk in pcm16k_mono:
            try:
                # Run small chunk inference; set beam_size low for speed.
                segments, _info = model.transcribe(
                    audio=chunk,
                    language=source_lang,
                    vad_filter=False,
                    beam_size=1,
                    without_timestamps=True,
                )
                text_parts = [seg.text.strip() for seg in segments if seg.text]
                text = " ".join(tp for tp in text_parts if tp)
                if text:
                    yield text
                await asyncio.sleep(0)
            except Exception as e:  # robust to transient errors
                logger.exception(f"STT error: {e}")
                await asyncio.sleep(0)
