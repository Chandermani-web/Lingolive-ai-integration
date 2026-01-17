import pyaudio
import whisper
from deep_translator import GoogleTranslator
from elevenlabs import ElevenLabs
import wave
import os
import asyncio
import socketio
import sentry_sdk
from dotenv import load_dotenv

# Initialize Socket.io server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = socketio.ASGIApp(sio)

# Load environment variables
load_dotenv()
sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=1.0)

# Audio settings
CHUNK = 480  # 30ms at 16000 Hz
FORMAT = pyaudio.paInt16
CHANNELS = 1  # Adjust based on Ankit's stream (likely mono)
RATE = 16000  # Match Ankit's stream rate
DEVICE_INDEX = 21  # For local mic testing; adjust if needed
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = "YOUR_VOICE_ID"  # Replace with ElevenLabs Voice ID

# Global model instance to avoid reloading
model = None

async def transcribe_chunk(audio_data):
    global model
    if not model:
        model = whisper.load_model("tiny")
    try:
        with wave.open("temp_chunk.wav", "wb") as wf:
            wf.setnchannels(CHANNELS)
            wf.setsampwidth(2)
            wf.setframerate(RATE)
            wf.writeframes(audio_data)
        result = model.transcribe("temp_chunk.wav", language="en")
        os.remove("temp_chunk.wav")
        return result["text"]
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return ""

async def translate_text(text, target_lang):
    try:
        translator = GoogleTranslator(source='auto', target=target_lang)
        return translator.translate(text)
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return ""

async def synthesize_audio(text, output_path="output_chunk.mp3"):
    try:
        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        audio = client.text_to_speech.convert(
            voice_id=VOICE_ID,
            text=text,
            model_id="eleven_multilingual_v2",
            voice_settings={"stability": 0.5, "similarity_boost": 0.5}
        )
        with open(output_path, "wb") as f:
            for chunk in audio:
                f.write(chunk)
        return output_path
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return ""

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    # Initialize buffer for this session
    sio.sessions[sid] = {'audio_buffer': bytearray(), 'chunk_counter': 0}

@sio.event
async def audio_stream(sid, data):
    """Receive audio stream chunks from Ankit's WebRTC client."""
    target_lang = sio.sessions[sid].get('language', 'hi')  # Default to Hindi
    audio_buffer = sio.sessions[sid]['audio_buffer']
    chunk_counter = sio.sessions[sid]['chunk_counter']

    # Append received audio data (assuming data is bytes)
    audio_buffer.extend(data['audio_chunk'])  # Expect {'audio_chunk': bytes}

    # Process when buffer reaches ~0.25s (480 * 8 samples)
    if len(audio_buffer) >= CHUNK * 8:
        audio_data = bytes(audio_buffer[:CHUNK * 8])
        audio_buffer[:] = audio_buffer[CHUNK * 8:]  # Keep remaining data

        text = await transcribe_chunk(audio_data)
        if text.strip():
            translated = await translate_text(text, target_lang)
            if translated:
                output = await synthesize_audio(translated, f"output_{chunk_counter}.mp3")
                await sio.emit('result', {
                    'transcription': text,
                    'translation': translated,
                    'audio_file': output
                }, to=sid)
                sio.sessions[sid]['chunk_counter'] += 1

@sio.event
async def set_language(sid, data):
    """Set language from frontend (Chandermani)."""
    target_lang = data.get('language', 'hi')
    sio.sessions[sid]['language'] = target_lang
    print(f"Language set to {target_lang} for session {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    if sid in sio.sessions:
        del sio.sessions[sid]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)