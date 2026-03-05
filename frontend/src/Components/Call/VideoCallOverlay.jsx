import { useEffect, useRef, useState } from "react";
import {
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Subtitles,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react";
import { useCall } from "../../Context/CallContext";

const VideoCallOverlay = () => {
  const {
    callState,
    callType,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    callError,
    isMuted,
    isVideoOff,
    captions,
    captionsEnabled,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleCaptions,
  } = useCall();

  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptionText, setShowCaptionText] = useState(null);
  const captionTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Only show for video calls
  const isVideoCall = callType === "video";
  const visibleStates = ["incoming", "calling", "connecting", "connected"];
  const shouldShow = isVideoCall && (visibleStates.includes(callState) || Boolean(callError));

  // Attach remote video stream
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    const audioEl = remoteAudioRef.current;
    if (!remoteStream) return;

    if (videoEl) {
      videoEl.srcObject = remoteStream;
      videoEl.muted = false;
      videoEl.play().catch((err) => {
        console.error("❌ Remote video autoplay blocked:", err.message);
        const resumeVideo = () => {
          videoEl.play().catch(() => {});
          document.removeEventListener("click", resumeVideo);
        };
        document.addEventListener("click", resumeVideo);
      });
    }

    // Also set audio element for guaranteed audio playback
    if (audioEl) {
      audioEl.srcObject = remoteStream;
      audioEl.muted = false;
      audioEl.volume = 1.0;
      audioEl.play().catch(() => {});
    }
  }, [remoteStream]);

  // Attach local video preview
  useEffect(() => {
    const el = localVideoRef.current;
    if (el && localStream) {
      el.srcObject = localStream;
      el.muted = true; // prevent echo
      el.play().catch(() => {});
    }
  }, [localStream]);

  // Fade captions after a delay
  useEffect(() => {
    if (!captions?.translation) return;

    setShowCaptionText({
      original: captions.transcription,
      translated: captions.translation,
    });

    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => {
      setShowCaptionText(null);
    }, 8000); // captions visible for 8 seconds

    return () => {
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [captions]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!shouldShow) return null;

  const displayUser = incomingCall?.caller || activeCall?.peer;
  const statusLabel = (() => {
    if (callError) return "Call error";
    switch (callState) {
      case "incoming": return "Incoming video call";
      case "calling": return "Calling...";
      case "connecting": return "Connecting...";
      case "connected": return "Connected";
      default: return "Video call";
    }
  })();

  // Incoming call UI (not yet connected)
  if (callState === "incoming") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="w-96 rounded-2xl bg-gray-900/95 border border-gray-700/60 p-6 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden">
            {displayUser?.profilePic ? (
              <img src={displayUser.profilePic} alt="" className="w-full h-full object-cover" />
            ) : (
              <Video className="w-8 h-8 text-white" />
            )}
          </div>
          <p className="text-gray-400 text-sm uppercase tracking-wider mb-1">Incoming Video Call</p>
          <p className="text-white text-xl font-bold mb-6">{displayUser?.username || "Unknown"}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={declineCall}
              className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium flex items-center gap-2"
            >
              <PhoneOff className="w-5 h-5" />
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium flex items-center gap-2"
            >
              <PhoneIncoming className="w-5 h-5" />
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed z-[60] bg-black ${
        isFullscreen
          ? "inset-0"
          : "bottom-4 right-4 w-[480px] h-[360px] rounded-2xl overflow-hidden shadow-2xl border border-gray-700/60"
      }`}
    >
      {/* Remote Video (full area) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Hidden audio element for guaranteed audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Status overlay when not connected */}
      {callState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden">
              {displayUser?.profilePic ? (
                <img src={displayUser.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </div>
            <p className="text-white font-semibold">{displayUser?.username}</p>
            <p className="text-gray-400 text-sm mt-1">{statusLabel}</p>
            {callState === "calling" && (
              <div className="flex justify-center gap-1 mt-3">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local Video (picture-in-picture) */}
      <div className="absolute top-3 right-3 w-32 h-24 rounded-lg overflow-hidden border-2 border-gray-600/50 bg-gray-900 shadow-lg">
        {isVideoOff ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <VideoOff className="w-6 h-6 text-gray-500" />
          </div>
        ) : (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        )}
      </div>

      {/* Caption / Subtitle Area */}
      {captionsEnabled && showCaptionText && callState === "connected" && (
        <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center pointer-events-none px-4">
          {/* Original transcription (smaller, dimmer) */}
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 mb-1 max-w-[90%]">
            <p className="text-gray-300 text-xs text-center leading-snug">
              {showCaptionText.original}
            </p>
          </div>
          {/* Translated text (larger, brighter) */}
          <div className="bg-black/80 backdrop-blur-md rounded-xl px-4 py-2 max-w-[90%] shadow-lg border border-blue-500/30">
            <p className="text-white text-sm md:text-base text-center font-medium leading-snug">
              {showCaptionText.translated}
            </p>
          </div>
        </div>
      )}

      {/* Error display */}
      {callError && (
        <div className="absolute top-3 left-3 right-36 bg-red-500/90 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-white shrink-0" />
          <span className="text-white text-sm truncate">{callError}</span>
        </div>
      )}

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-4 px-4">
        <div className="flex items-center justify-center gap-3">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? "bg-red-500/90 text-white"
                : "bg-gray-700/80 text-gray-200 hover:bg-gray-600"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Video */}
          <button
            onClick={toggleVideo}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isVideoOff
                ? "bg-red-500/90 text-white"
                : "bg-gray-700/80 text-gray-200 hover:bg-gray-600"
            }`}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Captions toggle */}
          <button
            onClick={toggleCaptions}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              captionsEnabled
                ? "bg-blue-500/90 text-white"
                : "bg-gray-700/80 text-gray-200 hover:bg-gray-600"
            }`}
            title={captionsEnabled ? "Disable subtitles" : "Enable subtitles"}
          >
            <Subtitles className="w-5 h-5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-700/80 text-gray-200 hover:bg-gray-600 transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Hang up */}
          <button
            onClick={endCall}
            className="w-14 h-11 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all"
            title="Hang up"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
