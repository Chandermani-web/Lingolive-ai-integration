from __future__ import annotations

import asyncio
from typing import AsyncIterator, Optional

from loguru import logger

try:
    import edge_tts  # type: ignore
except Exception:  # pragma: no cover
    edge_tts = None  # type: ignore


class TTS:
    """Streaming TTS using Edge-TTS.

    Outputs raw 16kHz 16-bit mono PCM for easy framing.
    """

    def __init__(self, voice: str = "en-US-AriaNeural", rate: str = "+0%", volume: str = "+0dB") -> None:
        self.voice = voice
        self.rate = rate
        self.volume = volume
        self.format = "raw-16khz-16bit-mono-pcm"

    async def synthesize(self, text: str) -> AsyncIterator[bytes]:
        if edge_tts is None:
            logger.warning("edge-tts not installed; TTS disabled.")
            return
        if not text:
            return
        communicate = edge_tts.Communicate(
            text=text,
            voice=self.voice,
            rate=self.rate,
            volume=self.volume,
        )
        try:
            async for chunk in communicate.stream(output_format=self.format):
                if chunk["type"] == "audio":
                    data: bytes = chunk["data"]
                    if data:
                        yield data
                await asyncio.sleep(0)
        except Exception as e:
            logger.exception(f"TTS error: {e}")
