import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AppContext from "./UseContext";
import { useSocket } from "./SocketContext";

const CallContext = createContext(null);

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" }
];

export const CallProvider = ({ children }) => {
  const { socket } = useSocket();
  const { user } = useContext(AppContext);
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callError, setCallError] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const peerConnectionRef = useRef(null);
  const targetIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const resetState = () => {
    setCallState("idle");
    setIncomingCall(null);
    setActiveCall(null);
    setIsMuted(false);
    targetIdRef.current = null;
  };

  const stopStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (err) {
        console.error("Failed to stop track", err);
      }
    });
  };

  const cleanupCall = () => {
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
    setLocalStream(null);
    setRemoteStream(null);
    resetState();
  };

  const createPeerConnection = (targetId) => {
    if (!socket) return null;
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    targetIdRef.current = targetId;

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
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
      if (connectionState === "connected") {
        setCallState("connected");
      }
      if (["disconnected", "failed", "closed"].includes(connectionState)) {
        cleanupCall();
      }
    };

    peerConnectionRef.current = connection;
    return connection;
  };

  const ensureMicrophone = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  const startCall = async (targetUser) => {
    if (!socket || !targetUser?._id || !user?._id) return;
    if (callState !== "idle") return;
    try {
      setCallError(null);
      setCallState("calling");
      setActiveCall({ peer: targetUser, direction: "outgoing" });
      const stream = await ensureMicrophone();
      const connection = createPeerConnection(targetUser._id);
      if (!connection) throw new Error("Unable to create peer connection");
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      socket.emit("call:offer", {
        targetId: targetUser._id,
        offer,
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
  };

  const acceptCall = async () => {
    if (!socket || !incomingCall) return;
    try {
      setCallError(null);
      setCallState("connecting");
      const stream = await ensureMicrophone();
      const connection = createPeerConnection(incomingCall.from);
      if (!connection) throw new Error("Unable to create peer connection");
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      await connection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      socket.emit("call:answer", {
        targetId: incomingCall.from,
        answer,
      });
      setActiveCall({ peer: incomingCall.caller, direction: "incoming" });
      setIncomingCall(null);
    } catch (error) {
      console.error("Failed to accept call", error);
      setCallError(error?.message || "Unable to accept call");
      cleanupCall();
    }
  };

  const declineCall = () => {
    if (!socket || !incomingCall) {
      cleanupCall();
      return;
    }
    socket.emit("call:decline", { targetId: incomingCall.from });
    cleanupCall();
  };

  const endCall = () => {
    if (socket && targetIdRef.current) {
      socket.emit("call:end", { targetId: targetIdRef.current, reason: "ended" });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  };

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (payload) => {
      if (!payload?.from || !payload.offer) return;
      setIncomingCall(payload);
      setCallState("incoming");
      setActiveCall({ peer: payload.caller, direction: "incoming" });
      targetIdRef.current = payload.from;
    };

    const handleAnswered = async ({ answer }) => {
      if (!peerConnectionRef.current || !answer) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState("connected");
      } catch (error) {
        console.error("Failed to handle answer", error);
        setCallError("Call failed to connect");
        cleanupCall();
      }
    };

    const handleCandidate = async ({ candidate }) => {
      if (!peerConnectionRef.current || !candidate) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    };

    const handleEnded = ({ reason }) => {
      if (reason) {
        setCallError(reason === "ended" ? null : reason);
      }
      cleanupCall();
    };

    const handleDeclined = () => {
      setCallError("Call declined");
      cleanupCall();
    };

    const handleUnavailable = () => {
      setCallError("User unavailable");
      cleanupCall();
    };

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
  }, [socket]);

  useEffect(() => {
    if (!callError) return undefined;
    const timer = setTimeout(() => {
      setCallError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [callError]);

  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  const value = useMemo(
    () => ({
      callState,
      incomingCall,
      activeCall,
      localStream,
      remoteStream,
      callError,
      isMuted,
      startCall,
      acceptCall,
      declineCall,
      endCall,
      toggleMute,
      cleanupCall,
    }),
    [
      callState,
      incomingCall,
      activeCall,
      localStream,
      remoteStream,
      callError,
      isMuted,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
