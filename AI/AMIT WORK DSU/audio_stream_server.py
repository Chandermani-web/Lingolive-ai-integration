import asyncio
import base64
import logging
import os
from collections import defaultdict

import numpy as np
import socketio
import whisper
from deep_translator import GoogleTranslator
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

try:
    import sentry_sdk
except ImportError:  # keep running if Sentry is missing
    sentry_sdk = None

load_dotenv()

LOG_LEVEL = os.getenv("AUDIO_SERVER_LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL)
logger = logging.getLogger("audio-stream")

if sentry_sdk and os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=1.0)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = socketio.ASGIApp(sio)

RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2
CHUNK_SAMPLES = int(RATE * 0.3)  # ~300ms windows
MAX_BUFFER_BYTES = CHUNK_SAMPLES * SAMPLE_WIDTH * 2

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")

_model = None
_eleven_client = None

_session_state = defaultdict(dict)


def _bytes_to_audio_array(raw: bytes) -> np.ndarray:
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if samples.size == 0:
        return samples
    return samples


async def _ensure_model():
    global _model
    if _model is not None:
        return _model
    loop = asyncio.get_event_loop()
    _model = await loop.run_in_executor(None, whisper.load_model, os.getenv("WHISPER_MODEL", "small"))
    logger.info("Whisper model loaded")
    return _model


async def _ensure_elevenlabs_client():
    global _eleven_client
    if _eleven_client is not None:
        return _eleven_client
    if not ELEVENLABS_API_KEY:
        logger.warning("ELEVENLABS_API_KEY missing; skipping synthesis")
        return None
    _eleven_client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    return _eleven_client


async def transcribe_chunk(raw: bytes, language: str | None) -> str:
    if not raw:
        return ""
    model = await _ensure_model()
    audio = _bytes_to_audio_array(raw)
    if audio.size == 0:
        return ""
    loop = asyncio.get_event_loop()

    def _do_transcribe():
        try:
            options = {"fp16": False}
            if language and language != "auto":
                options["language"] = language
            result = model.transcribe(audio, **options)
            return result.get("text", "").strip()
        except Exception as exc:
            logger.exception("Transcription failed: %s", exc)
            if sentry_sdk:
                sentry_sdk.capture_exception(exc)
            return ""

    return await loop.run_in_executor(None, _do_transcribe)


async def translate_text(text: str, target_lang: str) -> str:
    if not text:
        return ""
    try:
        translator = GoogleTranslator(source="auto", target=target_lang)
        return translator.translate(text) or ""
    except Exception as exc:
        logger.exception("Translation failed: %s", exc)
        if sentry_sdk:
            sentry_sdk.capture_exception(exc)
        return ""


async def synthesize_audio(text: str) -> str | None:
    if not text:
        return None
    client = await _ensure_elevenlabs_client()
    if not client or not ELEVENLABS_VOICE_ID:
        return None
    loop = asyncio.get_event_loop()

    def _do_tts():
        try:
            stream = client.text_to_speech.convert(
                voice_id=ELEVENLABS_VOICE_ID,
                text=text,
                model_id="eleven_multilingual_v2",
                voice_settings={"stability": 0.5, "similarity_boost": 0.5},
            )
            audio_bytes = b"".join(stream)
            return base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else None
        except Exception as exc:
            logger.exception("Synthesis failed: %s", exc)
            if sentry_sdk:
                sentry_sdk.capture_exception(exc)
            return None

    return await loop.run_in_executor(None, _do_tts)


async def _process_buffer(sid: str):
    session = _session_state.get(sid)
    if not session:
        return
    buffer = session.get("buffer")
    if not buffer:
        return
    chunk = bytes(buffer[: MAX_BUFFER_BYTES])
    del buffer[: MAX_BUFFER_BYTES]

    source_lang = session.get("source_lang", "auto")
    target_lang = session.get("target_lang")

    text = await transcribe_chunk(chunk, source_lang)
    if not text:
        return

    translated = text
    if target_lang and target_lang != "original":
        translated = await translate_text(text, target_lang)
        if not translated:
            translated = text

    encoded_audio = await synthesize_audio(translated)

    await sio.emit(
        "translation",
        {
            "transcription": text,
            "translation": translated,
            "tts": encoded_audio,
            "sequence": session.setdefault("sequence", 0),
        },
        to=sid,
    )
    session["sequence"] = session.get("sequence", 0) + 1


@sio.event
async def connect(sid, environ):
    logger.info("Client connected %s", sid)
    _session_state[sid] = {
        "buffer": bytearray(),
        "sequence": 0,
        "target_lang": os.getenv("DEFAULT_TRANSLATION_LANG", "hi"),
        "source_lang": os.getenv("DEFAULT_SOURCE_LANG", "auto"),
    }


@sio.event
async def disconnect(sid):
    logger.info("Client disconnected %s", sid)
    _session_state.pop(sid, None)


@sio.event
async def set_language(sid, data):
    session = _session_state.get(sid)
    if not session:
        return
    target = data.get("target_lang") if isinstance(data, dict) else None
    source = data.get("source_lang") if isinstance(data, dict) else None
    if target:
        session["target_lang"] = target
    if source:
        session["source_lang"] = source


@sio.event
async def audio_stream(sid, data):
    session = _session_state.get(sid)
    if not session:
        return
    raw = None
    if isinstance(data, (bytes, bytearray)):
        raw = bytes(data)
    elif isinstance(data, dict):
        chunk = data.get("audio_chunk")
        if isinstance(chunk, str):
            try:
                raw = base64.b64decode(chunk)
            except Exception:
                raw = None
        elif isinstance(chunk, (bytes, bytearray)):
            raw = bytes(chunk)
    if not raw:
        return
    buffer = session.setdefault("buffer", bytearray())
    buffer.extend(raw)
    if len(buffer) >= MAX_BUFFER_BYTES:
        await _process_buffer(sid)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
