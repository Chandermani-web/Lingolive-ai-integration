# LingoLive Real‑Time Translation (FastAPI + WebRTC)

This service provides low‑latency, real‑time audio translation over WebRTC using a Python backend.

- Signaling over WebSocket
- Media over WebRTC (Opus → PCM)
- Async audio pipeline: VAD → STT → Translate → TTS
- Streams translated audio back to the caller as a WebRTC audio track

## High‑Level Flow

1. Browser captures microphone via WebRTC and connects to this server.
2. `aiortc` decodes Opus to PCM; frames go to an async pipeline.
3. VAD gates voiced frames (20 ms) and groups ~0.5–1s voiced chunks.
4. STT decodes chunks with Faster‑Whisper (partial, low beam).
5. Translator (MarianMT) translates short phrases.
6. TTS (Edge‑TTS with raw PCM) synthesizes translated audio.
7. Server streams translated audio back via a dedicated audio track.

Latency target: < 500 ms end‑to‑end. Tune chunking, model size, and concurrency for your hardware.

## Project Layout

- `app.py` – FastAPI app + WebSocket signaling + aiortc PeerConnection
- `media/` – audio track wrappers and the pipeline orchestration
- `ai/` – pluggable VAD, STT, translation, TTS components
- `client/` – minimal browser client example
- `requirements.txt` – Python deps

## Quick Start (Local)

Create a virtual environment (Python 3.10+ recommended), then:

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Open the demo client:

- Serve `client/` with any static server (or open `client/example.html`).
- The client connects to `ws://localhost:8000/ws` for signaling.

Example with `uvicorn` only (serves signaling; open HTML directly from disk):

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Edge‑TTS note: no API key required. If you prefer fully offline TTS, replace `edge-tts` in `ai/tts.py` with Piper or Coqui TTS.

## Configuration

Environment variables (optional):

- `LL_SOURCE_LANG` – default source language (e.g., `en`)
- `LL_TARGET_LANG` – default target language (e.g., `es`)
- `LL_TTS_VOICE` – Edge TTS voice name (e.g., `en-US-AriaNeural`)

The client can override languages per session via the initial signaling message.

## Production Notes

- Deploy behind TLS (wss + https). Browsers require secure context for getUserMedia/WebRTC.
- Use smaller STT models for latency (e.g., `faster-whisper` tiny/base).
- Run multiple worker processes; isolate model load per process if needed.
- Consider an SFU for multi‑party; add per‑room fan‑out of translated tracks.
- Monitor pipeline with metrics (queue depth, chunk duration, RTT, underruns).

## Extending To 1:1 Calls

This example loops translated audio back to the same peer. For 1:1 calls, create two PeerConnections (one per caller) and route each caller's translated track to the other peer. The signaling payload should include a room identifier and routing preferences.

## License

Internal project asset – see repository policy.
