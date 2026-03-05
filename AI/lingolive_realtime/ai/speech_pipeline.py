"""
SpeechToSpeechPipeline - End-to-end Speech Translation Pipeline
Audio -> ASR (faster-whisper) -> Translation (MarianMT) -> TTS (Edge-TTS) -> Audio
"""
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Union

import numpy as np
import soundfile as sf

from .asr_module import ASRModule
from .translation_module import TranslationModule
from .tts_module import TTSModule
from .config import config, SUPPORTED_LANGUAGES, get_whisper_code

logger = logging.getLogger(__name__)


class SpeechToSpeechPipeline:
    """
    Complete pipeline:  Voice In -> Text (ASR) -> Translated Text -> Voice Out (TTS)

    Optimized for low latency on CPU.  GPU optional via faster-whisper CUDA.
    """

    def __init__(
        self,
        source_language: str = "english",
        target_language: str = "hindi",
        enable_translation: bool = True,
    ):
        self.source_language = source_language.lower()
        self.target_language = target_language.lower()
        self.enable_translation = enable_translation

        self._validate_languages()

        logger.info("Initializing Speech-to-Speech Pipeline...")
        self.asr = ASRModule()
        self.translator = TranslationModule() if enable_translation else None
        self.tts = TTSModule()

        self.stats = {
            "asr_time": 0.0,
            "translation_time": 0.0,
            "tts_time": 0.0,
            "total_time": 0.0,
            "processed": 0,
        }
        logger.info("Pipeline ready")

    def _validate_languages(self):
        for lang in (self.source_language, self.target_language):
            if lang not in SUPPORTED_LANGUAGES:
                raise ValueError(
                    f"Unsupported language '{lang}'. "
                    f"Supported: {list(SUPPORTED_LANGUAGES.keys())}"
                )

    # ── Main entry points ───────────────────────────────────────────────────

    def process(
        self,
        input_audio: Union[str, Path, np.ndarray],
        output_path: Optional[Union[str, Path]] = None,
        return_intermediate: bool = False,
    ) -> Union[np.ndarray, Dict]:
        """
        Full pipeline: audio in -> translated audio out.

        Args:
            input_audio: File path or numpy array (16 kHz float32 mono)
            output_path: Optional WAV file to save output
            return_intermediate: Include transcription/translation in result

        Returns:
            np.ndarray of audio, or dict if return_intermediate=True
        """
        t0 = time.time()

        # Step 1: ASR
        t1 = time.time()
        logger.info("Step 1/3: Speech-to-Text...")
        asr_result = self.asr.transcribe(input_audio, language=self.source_language)
        transcribed_text = asr_result["text"]
        asr_time = time.time() - t1
        logger.info(f"  Transcribed: {transcribed_text!r}  ({asr_time:.2f}s)")

        # Step 2: Translation
        translated_text = transcribed_text
        trans_time = 0.0
        if self.enable_translation and self.source_language != self.target_language:
            t2 = time.time()
            logger.info("Step 2/3: Translation...")
            result = self.translator.translate(
                transcribed_text, self.source_language, self.target_language
            )
            translated_text = result if isinstance(result, str) else result[0]
            trans_time = time.time() - t2
            logger.info(f"  Translated: {translated_text!r}  ({trans_time:.2f}s)")
        else:
            logger.info("Step 2/3: Skipped (same language)")

        # Step 3: TTS
        t3 = time.time()
        logger.info("Step 3/3: Text-to-Speech...")
        output_audio = self.tts.synthesize(translated_text, language=self.target_language)
        tts_time = time.time() - t3
        logger.info(f"  Audio length: {len(output_audio)/self.tts.sample_rate:.2f}s  ({tts_time:.2f}s)")

        # Save if requested
        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            sf.write(str(output_path), output_audio, self.tts.sample_rate)
            logger.info(f"  Saved to {output_path}")

        total_time = time.time() - t0
        self._update_stats(asr_time, trans_time, tts_time, total_time)

        if return_intermediate:
            return {
                "transcription": transcribed_text,
                "translation": translated_text,
                "output_audio": output_audio,
                "sample_rate": self.tts.sample_rate,
                "timings": {
                    "asr": asr_time,
                    "translation": trans_time,
                    "tts": tts_time,
                    "total": total_time,
                },
            }
        return output_audio

    def process_chunk(
        self,
        audio_chunk: Union[np.ndarray, bytes],
        is_final: bool = False,
    ) -> Optional[np.ndarray]:
        """Process a single audio chunk (for streaming/real-time)"""
        try:
            text = self.asr.transcribe_chunk(audio_chunk, language=self.source_language)
            if not text or not text.strip():
                return None

            if self.enable_translation and self.source_language != self.target_language:
                result = self.translator.translate(text, self.source_language, self.target_language)
                text = result if isinstance(result, str) else result[0]

            return self.tts.synthesize(text, language=self.target_language)
        except Exception as e:
            logger.error(f"Chunk processing error: {e}")
            return None

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _update_stats(self, asr_t, trans_t, tts_t, total_t):
        self.stats["asr_time"] += asr_t
        self.stats["translation_time"] += trans_t
        self.stats["tts_time"] += tts_t
        self.stats["total_time"] += total_t
        self.stats["processed"] += 1

    def get_performance_stats(self) -> Dict:
        s = self.stats.copy()
        n = s["processed"] or 1
        s["avg_total"] = s["total_time"] / n
        return s

    def get_system_info(self) -> Dict:
        return {
            "source_language": self.source_language,
            "target_language": self.target_language,
            "translation_enabled": self.enable_translation,
            "asr_info": self.asr.get_model_info(),
            "translation_info": self.translator.get_model_info() if self.translator else None,
            "tts_info": self.tts.get_model_info(),
            "supported_languages": len(SUPPORTED_LANGUAGES),
        }

    def get_supported_languages(self) -> List[str]:
        return list(SUPPORTED_LANGUAGES.keys())


def translate_speech(
    input_audio: str,
    output_audio: str,
    source_language: str = "english",
    target_language: str = "hindi",
) -> str:
    """Quick helper"""
    pipeline = SpeechToSpeechPipeline(source_language=source_language, target_language=target_language)
    pipeline.process(input_audio, output_path=output_audio)
    return output_audio
