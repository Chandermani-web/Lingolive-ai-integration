"""
Test Suite for LingoLive Speech-to-Speech Translation System
Run:  python test_speech_system.py
"""
import sys
import os
import io
import time
import logging
import warnings
import numpy as np
from pathlib import Path

# Fix Windows console encoding for Hindi/multilingual output
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["PYTHONIOENCODING"] = "utf-8"
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
warnings.filterwarnings("ignore", category=UserWarning)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PASS = 0
FAIL = 0


def section(title):
    print(f"\n{'='*70}\n  {title}\n{'='*70}\n")


def ok(msg):
    global PASS
    PASS += 1
    print(f"  [PASS] {msg}")


def fail(msg):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {msg}")


# ── Test 1: Imports ────────────────────────────────────────────────────────
def test_imports():
    section("Test 1: Imports")
    try:
        from ai import (
            ASRModule, TranslationModule, TTSModule,
            SpeechToSpeechPipeline, config, SUPPORTED_LANGUAGES,
        )
        ok(f"All imports OK  (version {getattr(sys.modules.get('ai'), '__version__', '?')})")
        return True
    except Exception as e:
        fail(f"Import error: {e}")
        return False


# ── Test 2: Configuration ─────────────────────────────────────────────────
def test_config():
    section("Test 2: Configuration")
    try:
        from ai import config, SUPPORTED_LANGUAGES, get_language_list
        print(f"  Whisper model   : {config.whisper_model_size}")
        print(f"  Whisper device  : {config.whisper_device}")
        print(f"  Sample rate     : {config.audio_sample_rate} Hz")
        langs = get_language_list()
        print(f"  Languages ({len(langs)}): {', '.join(sorted(langs))}")
        assert len(langs) >= 10, "Need at least 10 languages"
        ok("Configuration valid")
        return True
    except Exception as e:
        fail(f"Config error: {e}")
        return False


# ── Test 3: ASR Module ────────────────────────────────────────────────────
def test_asr():
    section("Test 3: ASR Module (faster-whisper)")
    try:
        from ai import ASRModule
        asr = ASRModule()
        info = asr.get_model_info()
        print(f"  Model     : {info['model_size']}")
        print(f"  Device    : {info['device']}")
        print(f"  Compute   : {info['compute_type']}")

        # Transcribe 3s of silence (should return empty or near-empty text)
        dummy = np.zeros(16000 * 3, dtype=np.float32)
        result = asr.transcribe(dummy, language="english")
        print(f"  Transcribed silence: {result['text']!r}")
        print(f"  Detected lang     : {result['language']}")
        ok("ASR module works")
        return True
    except Exception as e:
        fail(f"ASR error: {e}")
        logger.exception(e)
        return False


# ── Test 4: Translation Module ────────────────────────────────────────────
def test_translation():
    section("Test 4: Translation Module (MarianMT)")
    try:
        from ai import TranslationModule
        t = TranslationModule()
        info = t.get_model_info()
        print(f"  MarianMT available : {info['marian_available']}")
        print(f"  Languages          : {info['supported_languages']}")

        # Test en -> hi
        src = "Hello, how are you?"
        print(f"\n  English -> Hindi")
        print(f"  Input : {src}")
        start = time.time()
        result = t.translate(src, "english", "hindi")
        elapsed = time.time() - start
        print(f"  Output: {result}")
        print(f"  Time  : {elapsed:.2f}s")

        assert result and result != src, "Translation should produce different text"
        ok("Translation works")
        return True
    except Exception as e:
        fail(f"Translation error: {e}")
        logger.exception(e)
        return False


# ── Test 5: TTS Module ───────────────────────────────────────────────────
def test_tts():
    section("Test 5: TTS Module (Edge-TTS / gTTS)")
    try:
        from ai import TTSModule
        tts = TTSModule()
        info = tts.get_model_info()
        print(f"  Engine     : {info['engine']}")
        print(f"  Sample rate: {info['sample_rate']} Hz")

        text = "Hello, this is a test of the speech synthesis system."
        print(f"\n  Synthesizing: {text!r}")
        start = time.time()
        audio = tts.synthesize(text, language="english")
        elapsed = time.time() - start
        print(f"  Audio shape : {audio.shape}")
        print(f"  Duration    : {len(audio)/info['sample_rate']:.2f}s")
        print(f"  Time        : {elapsed:.2f}s")

        assert len(audio) > 1000, "Audio should have significant samples"

        # Save test file
        out = Path("test_tts_output.wav")
        tts.synthesize_to_file(text, out, language="english")
        assert out.exists(), "Output file should exist"
        print(f"  Saved to    : {out}")
        out.unlink()

        ok("TTS works")
        return True
    except Exception as e:
        fail(f"TTS error: {e}")
        logger.exception(e)
        return False


# ── Test 6: Full Pipeline ────────────────────────────────────────────────
def test_pipeline():
    section("Test 6: Full Pipeline (ASR -> Translate -> TTS)")
    try:
        from ai import SpeechToSpeechPipeline
        pipeline = SpeechToSpeechPipeline(
            source_language="english",
            target_language="hindi",
        )

        info = pipeline.get_system_info()
        print(f"  Source   : {info['source_language']}")
        print(f"  Target   : {info['target_language']}")
        print(f"  ASR      : {info['asr_info']['model_size']}")
        print(f"  TTS      : {info['tts_info']['engine']}")

        # Process a short silence chunk
        dummy = np.zeros(16000 * 2, dtype=np.float32)
        result = pipeline.process(dummy, return_intermediate=True)
        print(f"\n  Transcription : {result['transcription']!r}")
        print(f"  Translation   : {result['translation']!r}")
        print(f"  Audio samples : {len(result['output_audio'])}")
        print(f"  Timings       : {result['timings']}")

        ok("Pipeline works end-to-end")
        return True
    except Exception as e:
        fail(f"Pipeline error: {e}")
        logger.exception(e)
        return False


# ── Test 7: Multi-language TTS ────────────────────────────────────────────
def test_multilang_tts():
    section("Test 7: Multi-language TTS")
    try:
        from ai import TTSModule
        tts = TTSModule()

        test_phrases = {
            "english": "Hello, welcome to LingoLive!",
            "hindi":   "नमस्ते, लिंगोलाइव में आपका स्वागत है!",
        }

        for lang, phrase in test_phrases.items():
            start = time.time()
            audio = tts.synthesize(phrase, language=lang)
            elapsed = time.time() - start
            dur = len(audio) / tts.sample_rate
            print(f"  {lang:12s} : {dur:.2f}s audio  ({elapsed:.2f}s)")
            assert len(audio) > 500, f"{lang} should produce audio"

        ok("Multi-language TTS works")
        return True
    except Exception as e:
        fail(f"Multi-lang TTS error: {e}")
        logger.exception(e)
        return False


# ── Test 8: Batch Translation ─────────────────────────────────────────────
def test_batch_translation():
    section("Test 8: Batch Translation")
    try:
        from ai import TranslationModule
        t = TranslationModule()

        texts = ["Good morning", "How are you?", "Thank you very much"]
        print(f"  Input: {texts}")
        results = t.translate_batch(texts, "english", "hindi")
        print(f"  Output: {results}")
        assert len(results) == len(texts), "Should return same number of translations"
        ok("Batch translation works")
        return True
    except Exception as e:
        fail(f"Batch translation error: {e}")
        logger.exception(e)
        return False


# ── Run all ───────────────────────────────────────────────────────────────
def main():
    print("\n" + "=" * 70)
    print("  LingoLive Speech-to-Speech Translation System - Test Suite")
    print("=" * 70)

    tests = [
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("ASR Module", test_asr),
        ("Translation", test_translation),
        ("TTS Module", test_tts),
        ("Full Pipeline", test_pipeline),
        ("Multi-lang TTS", test_multilang_tts),
        ("Batch Translation", test_batch_translation),
    ]

    results = []
    for name, fn in tests:
        try:
            results.append((name, fn()))
        except Exception as e:
            fail(f"Test '{name}' crashed: {e}")
            results.append((name, False))

    section("Summary")
    for name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"  {status} {name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\n  Result: {passed}/{total} tests passed")

    if passed == total:
        print("\n  All tests passed! System is ready.")
    else:
        print(f"\n  {total - passed} test(s) failed. Check errors above.")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
