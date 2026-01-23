from __future__ import annotations

import collections
from typing import Deque, Iterable, Tuple

import webrtcvad


class VAD:
    """Voice Activity Detector using webrtcvad.

    - Operates on 16 kHz, 16-bit mono PCM.
    - Frame sizes must be 10, 20, or 30 ms.
    """

    def __init__(self, aggressiveness: int = 2, frame_ms: int = 20) -> None:
        if frame_ms not in (10, 20, 30):
            raise ValueError("webrtcvad supports 10/20/30 ms frames")
        self.vad = webrtcvad.Vad(aggressiveness)
        self.frame_ms = frame_ms
        self.sample_rate = 16000
        self.bytes_per_sample = 2
        self.frame_bytes = int(self.sample_rate * (self.frame_ms / 1000.0)) * self.bytes_per_sample

    def is_speech(self, frame: bytes) -> bool:
        if len(frame) != self.frame_bytes:
            return False
        return self.vad.is_speech(frame, self.sample_rate)

    def collect_voiced_chunks(
        self,
        frames: Iterable[bytes],
        min_chunk_ms: int = 500,
        max_chunk_ms: int = 1000,
    ) -> Iterable[Tuple[bytes, bool]]:
        """Yield (chunk_bytes, end_of_utterance) from input frames.

        Frames which are unvoiced are dropped. Voiced frames are grouped into
        ~min_chunk_ms chunks for low latency, with a hard limit at max_chunk_ms.
        The boolean indicates if this chunk likely ends an utterance (silence boundary).
        """
        frames_per_min = max(1, min_chunk_ms // self.frame_ms)
        frames_per_max = max(1, max_chunk_ms // self.frame_ms)

        window: Deque[bytes] = collections.deque()
        voiced_count = 0

        for frame in frames:
            speech = self.is_speech(frame)
            if speech:
                window.append(frame)
                voiced_count += 1
                if len(window) >= frames_per_min:
                    chunk = b"".join(window)
                    yield chunk, False
                    window.clear()
                    voiced_count = 0
                elif len(window) >= frames_per_max:
                    chunk = b"".join(window)
                    yield chunk, True
                    window.clear()
                    voiced_count = 0
            else:
                # silence: if we have partial voiced frames, flush as end of utterance
                if window:
                    chunk = b"".join(window)
                    yield chunk, True
                    window.clear()
                    voiced_count = 0

        if window:
            yield b"".join(window), True
