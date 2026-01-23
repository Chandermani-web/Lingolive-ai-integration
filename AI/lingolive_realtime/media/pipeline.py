from __future__ import annotations

import asyncio
from typing import AsyncIterator, Optional

import av
from aiortc import MediaStreamTrack
from loguru import logger

from .audio_utils import (
    pcm16_bytes_to_audioframes,
    resample_audioframe_to_pcm16_mono,
    split_pcm_into_frames,
)
from ..ai.vad import VAD
from ..ai.stt import STTEngine
from ..ai.translate import Translator
from ..ai.tts import TTS


class TranslatedAudioTrack(MediaStreamTrack):
    kind = "audio"

    def __init__(self) -> None:
        super().__init__()
        self.queue: asyncio.Queue[av.AudioFrame] = asyncio.Queue(maxsize=100)
        self._started = asyncio.Event()

    async def recv(self) -> av.AudioFrame:
        self._started.set()
        frame = await self.queue.get()
        return frame

    async def wait_started(self) -> None:
        await self._started.wait()

    async def push_pcm(self, pcm: bytes, sample_rate: int = 16000) -> None:
        for frame in pcm16_bytes_to_audioframes(pcm, sample_rate=sample_rate, frame_ms=20):
            try:
                self.queue.put_nowait(frame)
            except asyncio.QueueFull:
                # Drop frames to keep latency bounded
                logger.warning("Output queue full; dropping TTS frame.")


class TranslationPipeline:
    """End-to-end streaming pipeline: AudioFrame -> PCM -> VAD -> STT -> Translate -> TTS -> OutTrack."""

    def __init__(
        self,
        source_lang: str = "en",
        target_lang: str = "es",
        tts_voice: str = "en-US-AriaNeural",
    ) -> None:
        self.source_lang = source_lang
        self.target_lang = target_lang
        self.vad = VAD(aggressiveness=2, frame_ms=20)
        self.stt = STTEngine(model_size="base")
        self.translator = Translator()
        self.tts = TTS(voice=tts_voice)

        self.out_track = TranslatedAudioTrack()

        # Queues between stages
        self._pcm_q: asyncio.Queue[bytes] = asyncio.Queue(maxsize=200)
        self._voiced_chunk_q: asyncio.Queue[bytes] = asyncio.Queue(maxsize=50)
        self._text_q: asyncio.Queue[str] = asyncio.Queue(maxsize=50)
        self._translated_q: asyncio.Queue[str] = asyncio.Queue(maxsize=50)

        # Task handles for graceful shutdown
        self._tasks: list[asyncio.Task] = []
        self._closing = asyncio.Event()

    async def start(self) -> None:
        self._tasks = [
            asyncio.create_task(self._task_vad()),
            asyncio.create_task(self._task_stt()),
            asyncio.create_task(self._task_translate()),
            asyncio.create_task(self._task_tts()),
        ]

    async def stop(self) -> None:
        self._closing.set()
        for t in self._tasks:
            t.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)

    async def on_audio_frame(self, frame: av.AudioFrame) -> None:
        if self._closing.is_set():
            return
        pcm = resample_audioframe_to_pcm16_mono(frame, target_rate=16000)
        try:
            self._pcm_q.put_nowait(pcm)
        except asyncio.QueueFull:
            logger.warning("PCM queue full; dropping frame to bound latency.")

    async def _task_vad(self) -> None:
        try:
            while not self._closing.is_set():
                pcm = await self._pcm_q.get()
                for f in split_pcm_into_frames(pcm, sample_rate=16000, frame_ms=self.vad.frame_ms):
                    # VAD gating and chunking
                    for chunk, end_of_utt in self.vad.collect_voiced_chunks([f]):
                        # Emit small voiced chunk as soon as it accumulates
                        try:
                            self._voiced_chunk_q.put_nowait(chunk)
                        except asyncio.QueueFull:
                            logger.warning("Chunk queue full; dropping voiced chunk.")
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            pass

    async def _task_stt(self) -> None:
        async def chunk_iter() -> AsyncIterator[bytes]:
            while not self._closing.is_set():
                chunk = await self._voiced_chunk_q.get()
                yield chunk

        try:
            async for text in self.stt.transcribe_chunks(chunk_iter(), source_lang=self.source_lang):
                if text:
                    try:
                        self._text_q.put_nowait(text)
                    except asyncio.QueueFull:
                        logger.warning("Text queue full; dropping STT text.")
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            pass

    async def _task_translate(self) -> None:
        try:
            while not self._closing.is_set():
                text = await self._text_q.get()
                out = self.translator.translate(text, self.source_lang, self.target_lang)
                if out:
                    try:
                        self._translated_q.put_nowait(out)
                    except asyncio.QueueFull:
                        logger.warning("Translated queue full; dropping text.")
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            pass

    async def _task_tts(self) -> None:
        try:
            while not self._closing.is_set():
                text = await self._translated_q.get()
                async for pcm in self.tts.synthesize(text):
                    await self.out_track.push_pcm(pcm, sample_rate=16000)
                await asyncio.sleep(0)
        except asyncio.CancelledError:
            pass
