"""
LingoLive AI Translation API Server
====================================
Serves both text translation (for chat) and voice translation (for calls).

Endpoints:
  POST /api/translate          - Translate single text
  POST /api/translate/batch    - Translate batch of texts
  POST /api/voice/translate    - Upload audio -> get translated audio back
  GET  /api/languages          - List supported languages
  GET  /health                 - Health check
  WS   /ws/voice               - Real-time voice translation via WebSocket

Run:
  python translation_server.py
  # or:  uvicorn translation_server:app --host 0.0.0.0 --port 5001 --reload
"""
import asyncio
import base64
import io
import json
import logging
import os
import tempfile
import time
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

# Load .env file if present (for ELEVENLABS_API_KEY, etc.)
from dotenv import load_dotenv
load_dotenv()

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# ── AI modules ──────────────────────────────────────────────────────────────
from ai.config import SUPPORTED_LANGUAGES, WHISPER_LANG_CODES, EDGE_TTS_VOICES, config, get_edge_voice
from ai.asr_module import ASRModule
from ai.translation_module import TranslationModule
from ai.tts_module import TTSModule
from ai.elevenlabs_tts import ElevenLabsTTS

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="LingoLive AI Translation API",
    description="Real-time speech and text translation for Indian languages",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Transcription", "X-Translation", "X-Processing-Time"],
)

# ── Translation / TTS cache for repeated phrases ────────────────────────────
_translation_cache: dict = {}   # (text, src, tgt) -> translated
_tts_cache: dict = {}           # (text, lang) -> audio bytes (base64)
_CACHE_MAX = 500

# ── Lazy-loaded singletons ──────────────────────────────────────────────────
_asr: Optional[ASRModule] = None
_translator: Optional[TranslationModule] = None
_tts: Optional[TTSModule] = None
_elevenlabs: Optional[ElevenLabsTTS] = None


def get_asr() -> ASRModule:
    global _asr
    if _asr is None:
        _asr = ASRModule()
    return _asr


def get_translator() -> TranslationModule:
    global _translator
    if _translator is None:
        _translator = TranslationModule()
    return _translator


def get_tts() -> TTSModule:
    global _tts
    if _tts is None:
        _tts = TTSModule()
    return _tts


def get_elevenlabs() -> ElevenLabsTTS:
    global _elevenlabs
    if _elevenlabs is None:
        _elevenlabs = ElevenLabsTTS()
    return _elevenlabs


# ── Request / Response models ───────────────────────────────────────────────
class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "hi"


class BatchTranslateRequest(BaseModel):
    texts: List[str]
    source_lang: str = "auto"
    target_lang: str = "hi"


# ── Preload models at startup (eliminates cold-start delay) ────────────────
@app.on_event("startup")
async def preload_models():
    """Load ASR, Translation, TTS models at startup so first request is fast."""
    logger.info("Preloading AI models...")
    t0 = time.time()
    try:
        get_asr()
        logger.info("ASR model loaded")
    except Exception as e:
        logger.warning(f"ASR preload failed: {e}")
    try:
        get_translator()
        logger.info("Translator loaded")
    except Exception as e:
        logger.warning(f"Translator preload failed: {e}")
    try:
        get_tts()
        logger.info("TTS loaded")
    except Exception as e:
        logger.warning(f"TTS preload failed: {e}")
    logger.info(f"Models preloaded in {time.time()-t0:.1f}s")


# ── TEXT TRANSLATION endpoints ──────────────────────────────────────────────

@app.post("/api/translate")
async def translate_text(req: TranslateRequest):
    """Translate a single text string."""
    if not req.text or not req.text.strip():
        raise HTTPException(400, "text is required")
    if not req.target_lang:
        raise HTTPException(400, "target_lang is required")

    try:
        translator = get_translator()
        src = req.source_lang if req.source_lang != "auto" else "english"
        result = await asyncio.to_thread(translator.translate, req.text.strip(), src, req.target_lang)
        translated = result if isinstance(result, str) else result[0]

        return {
            "success": True,
            "translated_text": translated,
            "source_lang": src,
            "target_lang": req.target_lang,
            "original_text": req.text.strip(),
        }
    except Exception as e:
        logger.exception("Translation error")
        raise HTTPException(502, str(e))


@app.post("/api/translate/batch")
async def translate_batch(req: BatchTranslateRequest):
    """Translate a batch of texts."""
    if not req.texts:
        raise HTTPException(400, "texts array is required")

    try:
        translator = get_translator()
        src = req.source_lang if req.source_lang != "auto" else "english"
        results = translator.translate_batch(req.texts, src, req.target_lang)

        translations = []
        for original, translated in zip(req.texts, results):
            translations.append({
                "original": original,
                "translated": translated,
            })

        return {
            "success": True,
            "translations": translations,
            "source_lang": src,
            "target_lang": req.target_lang,
        }
    except Exception as e:
        logger.exception("Batch translation error")
        raise HTTPException(502, str(e))


# ── VOICE TRANSLATION endpoint ─────────────────────────────────────────────

@app.post("/api/voice/translate")
async def voice_translate(
    audio: UploadFile = File(...),
    source_lang: str = Form("english"),
    target_lang: str = Form("hindi"),
):
    """
    Upload an audio file -> get translated audio back (WAV).

    Flow: Audio -> ASR -> Translation -> TTS -> WAV response
    """
    t0 = time.time()

    # 1. Save uploaded audio to temp
    tmp_in = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    content = await audio.read()
    tmp_in.write(content)
    tmp_in.close()

    try:
        # 2. ASR
        asr = get_asr()
        asr_result = asr.transcribe(tmp_in.name, language=source_lang)
        transcribed = asr_result["text"]
        logger.info(f"ASR: {transcribed!r}")

        # 3. Translate
        translated = transcribed
        if source_lang.lower() != target_lang.lower():
            translator = get_translator()
            result = translator.translate(transcribed, source_lang, target_lang)
            translated = result if isinstance(result, str) else result[0]
            logger.info(f"Translated: {translated!r}")

        # 4. TTS
        tts = get_tts()
        audio_out = tts.synthesize(translated, language=target_lang)

        # 5. Encode as WAV
        buf = io.BytesIO()
        sf.write(buf, audio_out, tts.sample_rate, format="WAV")
        buf.seek(0)

        elapsed = time.time() - t0
        logger.info(f"Voice translation done in {elapsed:.2f}s")

        return StreamingResponse(
            buf,
            media_type="audio/wav",
            headers={
                "X-Transcription": transcribed,
                "X-Translation": translated,
                "X-Processing-Time": f"{elapsed:.2f}s",
            },
        )

    finally:
        Path(tmp_in.name).unlink(missing_ok=True)


# ── VOICE TRANSLATE (JSON response with base64 audio) ──────────────────────

@app.post("/api/voice/translate/json")
async def voice_translate_json(
    audio: UploadFile = File(...),
    source_lang: str = Form("english"),
    target_lang: str = Form("hindi"),
):
    """
    Upload audio -> get JSON with transcription, translation, and base64 audio.
    Easier for frontend to consume than streaming WAV.
    """
    t0 = time.time()

    tmp_in = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    content = await audio.read()
    tmp_in.write(content)
    tmp_in.close()

    try:
        # ASR
        asr = get_asr()
        asr_result = asr.transcribe(tmp_in.name, language=source_lang)
        transcribed = asr_result["text"]

        # Translate
        translated = transcribed
        if source_lang.lower() != target_lang.lower():
            translator = get_translator()
            result = translator.translate(transcribed, source_lang, target_lang)
            translated = result if isinstance(result, str) else result[0]

        # TTS
        tts = get_tts()
        audio_out = tts.synthesize(translated, language=target_lang)

        # Encode WAV to base64
        buf = io.BytesIO()
        sf.write(buf, audio_out, tts.sample_rate, format="WAV")
        audio_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        elapsed = time.time() - t0

        return JSONResponse({
            "success": True,
            "transcription": transcribed,
            "translated_text": translated,
            "audio_base64": audio_b64,
            "audio_format": "wav",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "processing_time": f"{elapsed:.2f}s",
        })

    finally:
        Path(tmp_in.name).unlink(missing_ok=True)


# ── LANGUAGES endpoint ─────────────────────────────────────────────────────

@app.get("/api/languages")
async def get_languages():
    """Return supported languages map."""
    # Return ISO code -> Name for frontend compatibility
    lang_map = {}
    for name, _ in SUPPORTED_LANGUAGES.items():
        iso = WHISPER_LANG_CODES.get(name, name[:2])
        lang_map[iso] = name.title()

    return {
        "success": True,
        "languages": lang_map,
    }


# ── HEALTH endpoint ────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "modules": {
            "asr": ASRModule.is_available(),
            "tts": TTSModule.is_available(),
        },
    }


# ── WebSocket: Real-time voice translation ─────────────────────────────────

@app.websocket("/ws/voice")
async def websocket_voice(ws: WebSocket):
    """
    Real-time voice translation over WebSocket — optimized for <1s latency.

    Protocol:
      Client sends JSON: { "type": "config", "source_lang": "en", "target_lang": "hi" }
      Client sends JSON: { "type": "audio", "data": "<base64 PCM16 16kHz mono>" }
      Server sends JSON: { "type": "result", "transcription": "...", "translation": "...", "audio": "<base64 wav>" }
    """
    await ws.accept()
    source_lang = "english"
    target_lang = "hindi"
    logger.info("WebSocket voice connection opened")

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "config":
                source_lang = msg.get("source_lang", source_lang)
                target_lang = msg.get("target_lang", target_lang)
                logger.info(f"WS config: {source_lang} -> {target_lang}")
                await ws.send_json({"type": "config_ack", "source_lang": source_lang, "target_lang": target_lang})
                continue

            if msg_type == "audio":
                audio_b64 = msg.get("data", "")
                if not audio_b64:
                    continue

                t_start = time.time()

                try:
                    pcm_bytes = base64.b64decode(audio_b64)
                    audio_np = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0

                    # Skip very short audio (less than 0.3s at 16kHz — lowered from 0.5s)
                    if len(audio_np) < 4800:
                        continue

                    # Check if audio is mostly silence (RMS below threshold)
                    rms = np.sqrt(np.mean(audio_np ** 2))
                    if rms < 0.005:
                        continue

                    logger.info(f"Processing audio: {len(audio_np)/16000:.1f}s, RMS={rms:.4f}")

                    # ── ASR (run in thread to not block event loop) ────────
                    asr = get_asr()
                    asr_result = await asyncio.to_thread(
                        asr.transcribe_fast, audio_np, source_lang
                    )
                    transcription = asr_result.get("text", "").strip()
                    t_asr = time.time()

                    if not transcription or len(transcription) < 2:
                        continue

                    logger.info(f"ASR [{source_lang}] ({t_asr-t_start:.2f}s): '{transcription}'")

                    # ── Translate (cached + threaded) ──────────────────────
                    cache_key = (transcription.lower(), source_lang.lower(), target_lang.lower())
                    translation = transcription

                    if source_lang.lower() != target_lang.lower():
                        if cache_key in _translation_cache:
                            translation = _translation_cache[cache_key]
                            logger.info(f"Translation cache hit: '{translation}'")
                        else:
                            translator = get_translator()
                            result = await asyncio.to_thread(
                                translator.translate, transcription, source_lang, target_lang
                            )
                            translation = result if isinstance(result, str) else result[0]
                            # Cache the translation
                            if len(_translation_cache) < _CACHE_MAX:
                                _translation_cache[cache_key] = translation

                    t_translate = time.time()
                    logger.info(f"Translated [{target_lang}] ({t_translate-t_asr:.2f}s): '{translation}'")

                    # ── TTS (streaming Edge-TTS — fast, no API key) ────────
                    audio_b64_out = ""
                    audio_format = "wav"

                    # Check TTS cache first
                    tts_cache_key = (translation.lower(), target_lang.lower())
                    if tts_cache_key in _tts_cache:
                        audio_b64_out, audio_format = _tts_cache[tts_cache_key]
                        logger.info("TTS cache hit")
                    elif translation.strip():
                        try:
                            if EDGE_TTS_AVAILABLE:
                                # Use Edge-TTS streaming directly (no API key, fast)
                                voice = get_edge_voice(target_lang)
                                communicate = edge_tts.Communicate(
                                    text=translation, voice=voice
                                )
                                audio_chunks = []
                                async for chunk in communicate.stream():
                                    if chunk["type"] == "audio" and chunk.get("data"):
                                        audio_chunks.append(chunk["data"])

                                if audio_chunks:
                                    mp3_bytes = b"".join(audio_chunks)
                                    audio_data, sr = sf.read(io.BytesIO(mp3_bytes))
                                    if audio_data.ndim > 1:
                                        audio_data = audio_data.mean(axis=-1)
                                    buf = io.BytesIO()
                                    sf.write(buf, audio_data.astype(np.float32), sr, format="WAV")
                                    audio_b64_out = base64.b64encode(buf.getvalue()).decode()
                                    audio_format = "wav"
                            else:
                                # Fallback to ElevenLabs
                                el = get_elevenlabs()
                                mp3_bytes = await asyncio.to_thread(
                                    el.synthesize_bytes, translation
                                )
                                audio_b64_out = base64.b64encode(mp3_bytes).decode()
                                audio_format = "mp3"
                        except Exception as tts_err:
                            logger.warning(f"TTS failed: {tts_err}")
                            try:
                                tts = get_tts()
                                audio_out = await asyncio.to_thread(
                                    tts.synthesize, translation, target_lang
                                )
                                if len(audio_out) > 0:
                                    buf = io.BytesIO()
                                    sf.write(buf, audio_out, tts.sample_rate, format="WAV")
                                    audio_b64_out = base64.b64encode(buf.getvalue()).decode()
                                    audio_format = "wav"
                            except Exception as fb_err:
                                logger.warning(f"Fallback TTS also failed: {fb_err}")

                        # Cache TTS result
                        if audio_b64_out and len(_tts_cache) < _CACHE_MAX:
                            _tts_cache[tts_cache_key] = (audio_b64_out, audio_format)

                    t_tts = time.time()
                    total = t_tts - t_start
                    logger.info(
                        f"Total: {total:.2f}s "
                        f"(ASR:{t_asr-t_start:.2f} + Trans:{t_translate-t_asr:.2f} + TTS:{t_tts-t_translate:.2f})"
                    )

                    await ws.send_json({
                        "type": "result",
                        "transcription": transcription,
                        "translation": translation,
                        "audio": audio_b64_out,
                        "audio_format": audio_format,
                        "source_lang": source_lang,
                        "target_lang": target_lang,
                        "processing_time": f"{total:.2f}s",
                    })

                except Exception as chunk_err:
                    logger.error(f"Error processing audio chunk: {chunk_err}")
                    continue

    except WebSocketDisconnect:
        logger.info("WebSocket voice connection closed")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")


# ── Entry point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "5001"))
    logger.info(f"Starting LingoLive AI Translation Server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
