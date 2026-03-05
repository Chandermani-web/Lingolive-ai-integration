"""
ElevenLabs TTS Module — High-quality voice synthesis via ElevenLabs API.
Uses the multilingual v2 model which supports Hindi, Tamil, Telugu, Bengali, etc.
"""
import io
import logging
import os
from typing import Optional

import httpx
import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)

# ── Defaults (override via env vars or constructor) ─────────────────────────
DEFAULT_API_KEY = os.getenv(
    "ELEVENLABS_API_KEY",
    "4d7e32d47680f44c782bd600335c9aed9d1c9a992362f11828ef162e33a57591",
)
DEFAULT_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")  # Adam
DEFAULT_MODEL = "eleven_multilingual_v2"

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"


class ElevenLabsTTS:
    """
    Convert text → speech using the ElevenLabs REST API.

    Returns:
        - raw MP3 bytes  (for sending over WebSocket)
        - or numpy float32 waveform  (for further processing)
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        voice_id: Optional[str] = None,
        model_id: str = DEFAULT_MODEL,
    ):
        self.api_key = api_key or DEFAULT_API_KEY
        self.voice_id = voice_id or DEFAULT_VOICE_ID
        self.model_id = model_id

        if not self.api_key:
            raise ValueError(
                "ElevenLabs API key is required.  "
                "Set ELEVENLABS_API_KEY env var or pass api_key= to constructor."
            )

        # Reusable HTTP client (connection pooling, reduced timeout)
        self._client = httpx.Client(timeout=8.0)

        logger.info(
            f"ElevenLabsTTS ready — voice={self.voice_id}, model={self.model_id}"
        )

    # ── Public API ──────────────────────────────────────────────────────────

    def synthesize_bytes(
        self,
        text: str,
        voice_id: Optional[str] = None,
        output_format: str = "mp3_44100_128",
    ) -> bytes:
        """
        Synthesize text → raw audio bytes (MP3 by default).

        Args:
            text: The text to speak.
            voice_id: Override the default voice.
            output_format: ElevenLabs output format string.

        Returns:
            Raw audio bytes (MP3).
        """
        vid = voice_id or self.voice_id
        url = ELEVENLABS_TTS_URL.format(voice_id=vid)

        resp = self._client.post(
            url,
            headers={
                "xi-api-key": self.api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": text,
                "model_id": self.model_id,
                "voice_settings": {
                    "stability": 0.50,
                    "similarity_boost": 0.75,
                    "style": 0.0,
                    "use_speaker_boost": True,
                },
            },
            params={"output_format": output_format},
        )

        if resp.status_code != 200:
            logger.error(
                f"ElevenLabs API error {resp.status_code}: {resp.text[:300]}"
            )
            raise RuntimeError(
                f"ElevenLabs TTS failed ({resp.status_code}): {resp.text[:200]}"
            )

        logger.info(
            f"ElevenLabs TTS OK — {len(resp.content)} bytes, voice={vid}"
        )
        return resp.content

    def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> np.ndarray:
        """
        Synthesize text → numpy float32 waveform (mono).

        Useful when you need to do further audio processing.
        """
        mp3_bytes = self.synthesize_bytes(text, voice_id=voice_id)
        audio, _sr = sf.read(io.BytesIO(mp3_bytes))
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        return audio.astype(np.float32)

    def close(self):
        """Release HTTP client resources."""
        self._client.close()

    def __del__(self):
        try:
            self._client.close()
        except Exception:
            pass
