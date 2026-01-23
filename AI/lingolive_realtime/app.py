from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict, Optional

import av
from aiortc import RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.signaling import BYE
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from loguru import logger

from media.pipeline import TranslationPipeline


app = FastAPI(title="LingoLive Realtime Translation")


HTML = """
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>LingoLive Realtime</title>
  </head>
  <body>
    <h3>Server OK</h3>
  </body>
 </html>
"""


@app.get("/")
async def index() -> HTMLResponse:
    return HTMLResponse(HTML)


async def _wait_ice_gathering_complete(pc: RTCPeerConnection) -> None:
    if pc.iceGatheringState == "complete":
        return
    complete = asyncio.Future()

    def check_state() -> None:
        if pc.iceGatheringState == "complete" and not complete.done():
            complete.set_result(None)

    pc.on("icegatheringstatechange", check_state)  # type: ignore
    await complete


@app.websocket("/ws")
async def websocket_signaling(ws: WebSocket) -> None:
    await ws.accept()

    # Default languages can be overridden by client init message
    source_lang = os.getenv("LL_SOURCE_LANG", "en")
    target_lang = os.getenv("LL_TARGET_LANG", "es")
    tts_voice = os.getenv("LL_TTS_VOICE", "en-US-AriaNeural")

    pc = RTCPeerConnection()
    pipeline = TranslationPipeline(source_lang=source_lang, target_lang=target_lang, tts_voice=tts_voice)

    @pc.on("track")
    async def on_track(track):  # type: ignore
        logger.info(f"Track received: kind={track.kind}")
        if track.kind == "audio":
            await pipeline.start()
            # Consume incoming audio frames
            try:
                while True:
                    frame: av.AudioFrame = await track.recv()
                    await pipeline.on_audio_frame(frame)
            except Exception as e:
                logger.info(f"Incoming track ended: {e}")

    # Pre-create outgoing translated audio track and add to pc
    pc.addTrack(pipeline.out_track)

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            mtype = msg.get("type")

            # Optional init override
            if mtype == "init":
                source_lang = msg.get("source_lang", source_lang)
                target_lang = msg.get("target_lang", target_lang)
                # Re-create pipeline if languages changed prior to SDP
                continue

            if mtype == "offer":
                sdp = msg["sdp"]
                offer = RTCSessionDescription(sdp=sdp["sdp"], type=sdp["type"])  # type: ignore
                await pc.setRemoteDescription(offer)

                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                await _wait_ice_gathering_complete(pc)
                local = pc.localDescription
                await ws.send_text(json.dumps({"type": "answer", "sdp": {"type": local.type, "sdp": local.sdp}}))

            elif mtype == "candidate":
                # Trickle ICE from client (optional). aiortc auto-handles candidates from SDP primarily.
                # If you implement trickle: pc.addIceCandidate(...) once aiortc exposes candidates.
                pass

            elif mtype == "bye":
                break

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    finally:
        logger.info("Closing PC and pipeline")
        await pipeline.stop()
        await pc.close()
