import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import AppContext from "./UseContext";
import { useSocket } from "./SocketContext";

const CallContext = createContext(null);

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// AI translation server WebSocket URL
const AI_WS_URL = "ws://localhost:5001/ws/voice";

// Audio chunk interval in ms (how often we send audio for translation)
const CHUNK_INTERVAL_MS = 3000;

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useContext(AppContext);

  // ── Call State ──────────────────────────────────────────────────────────
  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState(null); // "audio" | "video"
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callError, setCallError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // ── Real-time Translation / Captions ───────────────────────────────────
  const [captions, setCaptions] = useState(null); // { transcription, translation, timestamp }
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [sourceLang, setSourceLang] = useState("english");
  const [targetLang, setTargetLang] = useState("hindi");

  // ── Refs ────────────────────────────────────────────────────────────────
  const peerConnectionRef = useRef(null);
  const targetIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const aiWsRef = useRef(null);               // WebSocket to AI server
  const audioContextRef = useRef(null);        // AudioContext for PCM capture
  const scriptNodeRef = useRef(null);          // ScriptProcessorNode
  const sourceNodeRef = useRef(null);          // MediaStreamSource
  const pcmBufferRef = useRef([]);             // Raw PCM float32 samples buffer
  const chunkIntervalRef = useRef(null);       // Interval for sending chunks
  const translatedAudioRef = useRef(null);     // <audio> element for translated voice playback
  const audioQueueRef = useRef([]);            // Queue of base64 audio chunks to play sequentially
  const isPlayingRef = useRef(false);          // Whether we're currently playing translated audio

  // ── Helpers ─────────────────────────────────────────────────────────────

  const resetState = () => {
    setCallState("idle");
    setCallType(null);
    setIncomingCall(null);
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCaptions(null);
    targetIdRef.current = null;
  };

  const stopStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try { track.stop(); } catch (err) { console.error("Failed to stop track", err); }
    });
  };

  // ── Translated Voice Playback ────────────────────────────────────────────

  const playTranslatedAudio = useCallback((b64Audio, format = "mp3") => {
    if (!b64Audio) return;

    // Queue the audio chunk
    audioQueueRef.current.push({ b64: b64Audio, format });
    processAudioQueue();
  }, []);

  const processAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const { b64, format } = audioQueueRef.current.shift();
    const mimeType = format === "wav" ? "audio/wav" : "audio/mpeg";

    try {
      const byteChars = atob(b64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Create or reuse an <audio> element
      if (!translatedAudioRef.current) {
        translatedAudioRef.current = new Audio();
      }
      const audio = translatedAudioRef.current;
      audio.src = url;
      audio.volume = 1.0;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        console.log("🔊 Translated audio finished, queue size:", audioQueueRef.current.length);
        processAudioQueue(); // play next in queue
      };
      audio.onerror = (e) => {
        console.error("❌ Translated audio playback error:", e);
        URL.revokeObjectURL(url);
        isPlayingRef.current = false;
        processAudioQueue();
      };

      audio.play().then(() => {
        console.log("🔊 Playing translated audio (" + format + ")");
      }).catch((err) => {
        console.error("❌ Translated audio play() blocked:", err.message);
        isPlayingRef.current = false;
        processAudioQueue();
      });
    } catch (e) {
      console.error("❌ Failed to decode translated audio:", e);
      isPlayingRef.current = false;
      processAudioQueue();
    }
  }, []);

  // ── AI Translation WebSocket ───────────────────────────────────────────

  const connectAIWebSocket = useCallback(() => {
    // Close stale connections
    if (aiWsRef.current) {
      if (aiWsRef.current.readyState === WebSocket.OPEN) return;
      try { aiWsRef.current.close(); } catch (_) {}
      aiWsRef.current = null;
    }

    console.log("🤖 Attempting AI WS connection to:", AI_WS_URL);
    try {
      const ws = new WebSocket(AI_WS_URL);
      ws.onopen = () => {
        console.log("🤖 AI translation WS connected ✅");
        ws.send(JSON.stringify({
          type: "config",
          source_lang: sourceLang,
          target_lang: targetLang,
        }));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("🤖 AI WS received:", msg.type, msg.transcription ? `"${msg.transcription}"` : "");
          if (msg.type === "result" && msg.transcription?.trim()) {
            // Update subtitle captions
            setCaptions({
              transcription: msg.transcription,
              translation: msg.translation,
              timestamp: Date.now(),
              audio: msg.audio || null,
            });
            // Play translated voice via ElevenLabs audio
            if (msg.audio) {
              playTranslatedAudio(msg.audio, msg.audio_format || "mp3");
            }
          }
        } catch (e) {
          console.warn("AI WS parse error:", e);
        }
      };
      ws.onerror = (e) => {
        console.error("❌ AI WS error:", e);
        console.error("   URL:", AI_WS_URL, "readyState:", ws.readyState);
      };
      ws.onclose = (e) => {
        console.log("🤖 AI WS closed — code:", e.code, "reason:", e.reason || "(none)");
        aiWsRef.current = null;
      };
      aiWsRef.current = ws;
    } catch (e) {
      console.error("❌ Failed to create AI WS:", e);
    }
  }, [sourceLang, targetLang]);

  const disconnectAIWebSocket = useCallback(() => {
    if (aiWsRef.current) {
      aiWsRef.current.close();
      aiWsRef.current = null;
    }
  }, []);

  // ── Audio Chunking via Web Audio API (direct PCM capture) ───────────

  const startAudioChunking = useCallback((stream) => {
    stopAudioChunking(); // cleanup any existing

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) {
      console.warn("⚠️ No audio tracks to chunk");
      return;
    }

    console.log("🎙️ Starting audio chunking — tracks:", audioTracks.map(t => `${t.label} [${t.readyState}, enabled=${t.enabled}]`));

    try {
      // Create AudioContext at 16kHz (what Whisper expects)
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      console.log("🎙️ AudioContext created — state:", ctx.state, "sampleRate:", ctx.sampleRate);

      // CRITICAL: Resume AudioContext — browsers suspend it unless triggered by user gesture
      if (ctx.state === "suspended") {
        console.log("🔊 AudioContext suspended, resuming…");
        ctx.resume().then(() => {
          console.log("🔊 AudioContext resumed ✅ state:", ctx.state);
        }).catch(e => console.error("❌ AudioContext resume failed:", e));
      }

      const source = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      sourceNodeRef.current = source;

      // ScriptProcessorNode captures raw PCM samples
      const bufferSize = 4096;
      const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
      scriptNodeRef.current = scriptNode;

      pcmBufferRef.current = [];
      let capturedSamples = 0;

      scriptNode.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        pcmBufferRef.current.push(new Float32Array(input));
        capturedSamples += input.length;
        // Diagnostic log every ~5 seconds
        if (capturedSamples % (16000 * 5) < bufferSize) {
          const rms = Math.sqrt(input.reduce((s, v) => s + v * v, 0) / input.length);
          console.log(`🎙️ Capturing audio: ${(capturedSamples / 16000).toFixed(0)}s total, chunks buffered: ${pcmBufferRef.current.length}, RMS: ${rms.toFixed(5)}`);
        }
      };

      source.connect(scriptNode);
      // Route through a silent gain node so audio is processed but not replayed through speakers
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      scriptNode.connect(silentGain);
      silentGain.connect(ctx.destination);

      // Send buffered PCM to AI every CHUNK_INTERVAL_MS
      chunkIntervalRef.current = setInterval(() => {
        sendPCMToAI();
      }, CHUNK_INTERVAL_MS);

      console.log("🎙️ Audio chunking started ✅ (ScriptProcessor, sampleRate:", ctx.sampleRate, "interval:", CHUNK_INTERVAL_MS, "ms)");
    } catch (e) {
      console.error("❌ Failed to start audio chunking:", e);
    }
  }, []);

  const stopAudioChunking = useCallback(() => {
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    if (scriptNodeRef.current) {
      try { scriptNodeRef.current.disconnect(); } catch (e) {}
      scriptNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    pcmBufferRef.current = [];
    console.log("🎙️ Audio chunking stopped");
  }, []);

  const sendPCMToAI = useCallback(() => {
    if (!aiWsRef.current || aiWsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ AI WS not open (state:", aiWsRef.current?.readyState, "), skipping audio chunk. URL:", AI_WS_URL);
      return;
    }
    if (pcmBufferRef.current.length === 0) {
      console.debug("📤 No PCM data buffered, skipping");
      return;
    }

    // Merge all buffered Float32Arrays into one
    const chunks = pcmBufferRef.current.splice(0);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    if (totalLength < 1600) return; // skip if less than 0.1s of audio at 16kHz

    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert float32 -> int16 PCM
    const pcm16 = new Int16Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      const s = Math.max(-1, Math.min(1, merged[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Base64 encode the int16 bytes
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
      for (let j = 0; j < slice.length; j++) {
        binary += String.fromCharCode(slice[j]);
      }
    }
    const b64 = btoa(binary);

    aiWsRef.current.send(JSON.stringify({ type: "audio", data: b64 }));
    console.log(`📤 Sent ${(totalLength / 16000).toFixed(1)}s of audio to AI (${b64.length} b64 chars)`);
  }, []);

  // ── Cleanup ─────────────────────────────────────────────────────────────

  const cleanupCall = useCallback(() => {
    stopAudioChunking();
    disconnectAIWebSocket();

    // Stop translated audio playback
    if (translatedAudioRef.current) {
      translatedAudioRef.current.pause();
      translatedAudioRef.current.src = "";
      translatedAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    resetState();
  }, [stopAudioChunking, disconnectAIWebSocket]);

  // ── Peer Connection ────────────────────────────────────────────────────

  const createPeerConnection = useCallback((targetId) => {
    if (!socket) return null;
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    targetIdRef.current = targetId;

    connection.ontrack = (event) => {
      console.log("🔊 ontrack fired — kind:", event.track.kind, "readyState:", event.track.readyState, "enabled:", event.track.enabled, "streams:", event.streams?.length);
      let stream = remoteStreamRef.current;
      if (!stream) {
        stream = event.streams?.[0] || new MediaStream();
        remoteStreamRef.current = stream;
      }
      // Make sure the track is in the stream
      if (!stream.getTracks().find((t) => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      // Update state — force re-render by making a new reference
      setRemoteStream(new MediaStream(stream.getTracks()));

      // Start audio chunking for translation when remote audio arrives
      if (event.track.kind === "audio") {
        console.log("🔊 Remote AUDIO track received — starting AI translation pipeline, captionsEnabled:", captionsEnabled);
        connectAIWebSocket();
        // Small delay to let the stream stabilize
        setTimeout(() => {
          const audioTracks = stream.getAudioTracks();
          console.log("🔊 Starting chunking with", audioTracks.length, "audio track(s)");
          startAudioChunking(new MediaStream(audioTracks));
        }, 1500);
      }
    };

    connection.onicecandidate = (event) => {
      if (event.candidate && targetIdRef.current) {
        socket.emit("call:ice-candidate", {
          targetId: targetIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    connection.onconnectionstatechange = () => {
      const { connectionState } = connection;
      console.log("🔗 Connection state:", connectionState);
      if (connectionState === "connected") {
        setCallState("connected");
      }
      if (connectionState === "failed") {
        console.error("❌ WebRTC connection failed");
        setCallError("Connection failed. Check your network.");
        cleanupCall();
      }
      if (["disconnected", "closed"].includes(connectionState)) {
        cleanupCall();
      }
    };

    connection.oniceconnectionstatechange = () => {
      console.log("🧊 ICE connection state:", connection.iceConnectionState);
    };

    peerConnectionRef.current = connection;
    return connection;
  }, [socket, captionsEnabled, connectAIWebSocket, startAudioChunking, cleanupCall]);

  // ── Media acquisition ─────────────────────────────────────────────────

  const getMedia = useCallback(async (withVideo = false) => {
    if (localStreamRef.current) {
      // If upgrading from audio to video
      if (withVideo && !localStreamRef.current.getVideoTracks().length) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getVideoTracks().forEach((track) => {
          localStreamRef.current.addTrack(track);
        });
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
      return localStreamRef.current;
    }
    const constraints = { audio: true };
    if (withVideo) {
      constraints.video = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ── Start Call (audio or video) ────────────────────────────────────────

  const startCall = useCallback(async (targetUser, type = "audio") => {
    console.log(`🔍 startCall (${type}) with:`, targetUser?._id);
    if (!socket || !targetUser?._id || !user?._id || callState !== "idle") {
      console.error("❌ Cannot start call — missing prerequisites");
      return;
    }

    try {
      setCallError(null);
      setCallState("calling");
      setCallType(type);
      setActiveCall({ peer: targetUser, direction: "outgoing" });

      const isVideo = type === "video";
      const stream = await getMedia(isVideo);
      const connection = createPeerConnection(targetUser._id);
      if (!connection) throw new Error("Unable to create peer connection");

      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      console.log(`📞 Emitting call:offer (${type}) to`, targetUser._id);
      socket.emit("call:offer", {
        targetId: targetUser._id,
        offer,
        callType: type,
        caller: {
          _id: user._id,
          username: user.username,
          profilePic: user.profilePic || null,
        },
      });
    } catch (error) {
      console.error("Failed to start call", error);
      setCallError(error?.message || "Unable to start call");
      cleanupCall();
    }
  }, [socket, user, callState, getMedia, createPeerConnection, cleanupCall]);

  // ── Accept Call ────────────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    try {
      setCallError(null);
      setCallState("connecting");

      const isVideo = incomingCall.callType === "video";
      setCallType(incomingCall.callType || "audio");

      const stream = await getMedia(isVideo);
      const connection = createPeerConnection(incomingCall.from);
      if (!connection) throw new Error("Unable to create peer connection");

      stream.getTracks().forEach((track) => {
        console.log("📌 Adding track:", track.kind);
        connection.addTrack(track, stream);
      });

      await connection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      socket.emit("call:answer", {
        targetId: incomingCall.from,
        answer,
      });
      setActiveCall({ peer: incomingCall.caller, direction: "incoming" });
      setIncomingCall(null);
      console.log("✅ Call accepted successfully!");
    } catch (error) {
      console.error("❌ Failed to accept call:", error);
      setCallError(error?.message || "Unable to accept call");
      cleanupCall();
    }
  }, [socket, incomingCall, getMedia, createPeerConnection, cleanupCall]);

  // ── Decline / End / Toggle ─────────────────────────────────────────────

  const declineCall = useCallback(() => {
    if (!socket || !incomingCall) { cleanupCall(); return; }
    socket.emit("call:decline", { targetId: incomingCall.from });
    cleanupCall();
  }, [socket, incomingCall, cleanupCall]);

  const endCall = useCallback(() => {
    if (socket && targetIdRef.current) {
      socket.emit("call:end", { targetId: targetIdRef.current, reason: "ended" });
    }
    cleanupCall();
  }, [socket, cleanupCall]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextOff = !isVideoOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff;
    });
    setIsVideoOff(nextOff);
  }, [isVideoOff]);

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled((prev) => !prev);
  }, []);

  const updateLanguages = useCallback((src, tgt) => {
    setSourceLang(src);
    setTargetLang(tgt);
    // Update the AI WS config if connected
    if (aiWsRef.current?.readyState === WebSocket.OPEN) {
      aiWsRef.current.send(JSON.stringify({
        type: "config",
        source_lang: src,
        target_lang: tgt,
      }));
    }
  }, []);

  // ── Socket Event Handlers ──────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload) => {
      if (!payload?.from || !payload.offer) return;
      setIncomingCall(payload);
      setCallState("incoming");
      setCallType(payload.callType || "audio");
      setActiveCall({ peer: payload.caller, direction: "incoming" });
      targetIdRef.current = payload.from;
    };

    const handleAnswered = async ({ answer }) => {
      if (!peerConnectionRef.current || !answer) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Remote description set, flushing", pendingCandidatesRef.current.length, "queued ICE candidates");
        for (const candidate of pendingCandidatesRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed to add queued ICE candidate", err);
          }
        }
        pendingCandidatesRef.current = [];
        setCallState("connecting");
      } catch (error) {
        console.error("Failed to handle answer", error);
        setCallError("Call failed to connect");
        cleanupCall();
      }
    };

    const handleCandidate = async ({ candidate }) => {
      if (!peerConnectionRef.current || !candidate) return;
      if (!peerConnectionRef.current.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    };

    const handleEnded = ({ reason }) => {
      if (reason) setCallError(reason === "ended" ? null : reason);
      cleanupCall();
    };

    const handleDeclined = () => { setCallError("Call declined"); cleanupCall(); };
    const handleUnavailable = () => { setCallError("User unavailable"); cleanupCall(); };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answered", handleAnswered);
    socket.on("call:ice-candidate", handleCandidate);
    socket.on("call:ended", handleEnded);
    socket.on("call:declined", handleDeclined);
    socket.on("call:unavailable", handleUnavailable);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answered", handleAnswered);
      socket.off("call:ice-candidate", handleCandidate);
      socket.off("call:ended", handleEnded);
      socket.off("call:declined", handleDeclined);
      socket.off("call:unavailable", handleUnavailable);
    };
  }, [socket, cleanupCall]);

  useEffect(() => {
    if (!callError) return;
    const timer = setTimeout(() => setCallError(null), 5000);
    return () => clearTimeout(timer);
  }, [callError]);

  useEffect(() => {
    return () => cleanupCall();
  }, [cleanupCall]);

  // ── Context Value ──────────────────────────────────────────────────────

  const contextValue = {
    // Call state
    callState,
    callType,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    callError,
    isMuted,
    isVideoOff,
    // Captions / Translation
    captions,
    captionsEnabled,
    sourceLang,
    targetLang,
    // Actions
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleCaptions,
    updateLanguages,
    cleanupCall,
  };

  return <CallContext.Provider value={contextValue}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within a CallProvider");
  return context;
};
