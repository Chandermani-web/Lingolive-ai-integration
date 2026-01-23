from __future__ import annotations

import asyncio
from typing import AsyncIterator, Iterator, Optional

import av
import numpy as np


def resample_audioframe_to_pcm16_mono(frame: av.AudioFrame, target_rate: int = 16000) -> bytes:
    """Convert an av.AudioFrame to 16kHz mono signed 16-bit PCM bytes."""
    # Ensure format s16, mono, target rate
    resampler = av.AudioResampler(format="s16", layout="mono", rate=target_rate)
    frame16 = resampler.resample(frame)
    # frame16.planes[0] holds interleaved PCM for mono
    return bytes(frame16.planes[0])


def split_pcm_into_frames(pcm: bytes, sample_rate: int, frame_ms: int = 20) -> Iterator[bytes]:
    """Yield fixed-size PCM frames (e.g., 20 ms) from a PCM byte buffer."""
    bytes_per_sample = 2
    samples_per_frame = int(sample_rate * (frame_ms / 1000.0))
    stride = samples_per_frame * bytes_per_sample
    for i in range(0, len(pcm), stride):
        chunk = pcm[i : i + stride]
        if len(chunk) == stride:
            yield chunk


async def chunker(iterable: AsyncIterator[bytes], chunk_size: int = 3200) -> AsyncIterator[bytes]:
    """Group async stream of bytes into fixed-size chunks if needed (utility)."""
    buf = bytearray()
    async for part in iterable:
        buf.extend(part)
        while len(buf) >= chunk_size:
            yield bytes(buf[:chunk_size])
            del buf[:chunk_size]
        await asyncio.sleep(0)
    if buf:
        yield bytes(buf)


def pcm16_bytes_to_audioframes(pcm: bytes, sample_rate: int = 16000, frame_ms: int = 20) -> Iterator[av.AudioFrame]:
    """Pack raw PCM bytes into av.AudioFrame objects of frame_ms duration."""
    bytes_per_sample = 2
    samples_per_frame = int(sample_rate * (frame_ms / 1000.0))
    stride = samples_per_frame * bytes_per_sample

    for i in range(0, len(pcm), stride):
        chunk = pcm[i : i + stride]
        if len(chunk) < stride:
            break
        # Create numpy view and then av.AudioFrame
        arr = np.frombuffer(chunk, dtype=np.int16)
        # Create frame with mono layout
        frame = av.AudioFrame(format="s16", layout="mono", samples=samples_per_frame)
        frame.planes[0].update(chunk)
        frame.sample_rate = sample_rate
        yield frame
