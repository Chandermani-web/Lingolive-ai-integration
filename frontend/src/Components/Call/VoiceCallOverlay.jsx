import { useEffect, useRef, useState } from "react";
import { Phone, PhoneIncoming, PhoneOff, Mic, MicOff, Subtitles, AlertCircle } from "lucide-react";
import { useCall } from "../../Context/CallContext";

const VoiceCallOverlay = () => {
  const {
    callState,
    callType,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    callError,
    isMuted,
    captions,
    captionsEnabled,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCaptions,
  } = useCall();

  const remoteAudioRef = useRef(null);
  const localAudioRef = useRef(null);
  const [showCaptionText, setShowCaptionText] = useState(null);
  const captionTimerRef = useRef(null);

  // Only show for AUDIO calls (video calls use VideoCallOverlay)
  const isAudioCall = callType === "audio" || callType === null;
  const visibleStates = ["incoming", "calling", "connecting", "connected"];
  const shouldShow = isAudioCall && (visibleStates.includes(callState) || Boolean(callError));
  // Don't show if callType is explicitly "video"
  const hide = callType === "video";

  useEffect(() => {
    const element = remoteAudioRef.current;
    if (element && remoteStream) {
      console.log("🔊 Attaching remote stream to audio element, tracks:", remoteStream.getAudioTracks().length);
      element.srcObject = remoteStream;
      element.muted = false;
      element.volume = 1.0;
      const playPromise = element.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.error("❌ Remote audio autoplay blocked:", err.message);
          const resumeAudio = () => {
            element.play().catch(() => {});
            document.removeEventListener("click", resumeAudio);
            document.removeEventListener("touchstart", resumeAudio);
          };
          document.addEventListener("click", resumeAudio);
          document.addEventListener("touchstart", resumeAudio);
        });
      }
    }
  }, [remoteStream]);

  useEffect(() => {
    const element = localAudioRef.current;
    if (element && localStream) {
      element.srcObject = localStream;
      element.muted = true;
      element.play().catch(() => {});
    }
  }, [localStream]);

  // Fade captions
  useEffect(() => {
    if (!captions?.translation) return;
    setShowCaptionText({
      original: captions.transcription,
      translated: captions.translation,
    });
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setShowCaptionText(null), 8000);
    return () => { if (captionTimerRef.current) clearTimeout(captionTimerRef.current); };
  }, [captions]);

  if (!shouldShow || hide) return null;

  const displayUser = incomingCall?.caller || activeCall?.peer;
  const statusLabel = (() => {
    if (callError) return "Call error";
    switch (callState) {
      case "incoming":
        return "Incoming call";
      case "calling":
        return "Calling";
      case "connecting":
        return "Connecting";
      case "connected":
        return "Connected";
      default:
        return "Voice call";
    }
  })();

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 max-w-full rounded-2xl bg-gray-900/95 text-gray-100 shadow-2xl border border-gray-700/60 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            {displayUser?.profilePic ? (
              <img
                src={displayUser.profilePic}
                alt={displayUser.username || "Caller"}
                className="w-full h-full object-cover"
              />
            ) : (
              <PhoneIncoming className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400 uppercase tracking-wide">{statusLabel}</p>
          <p className="text-lg font-semibold text-white truncate">
            {displayUser?.username || "Unknown user"}
          </p>
          {callError && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span>{callError}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-5 pb-4 pt-2 gap-3">
        {callState === "incoming" ? (
          <>
            <button
              onClick={declineCall}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/90 hover:bg-red-600 text-white font-medium transition"
            >
              <PhoneOff className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-500/90 hover:bg-green-600 text-white font-medium transition"
            >
              <PhoneIncoming className="w-4 h-4" />
              Accept
            </button>
          </>
        ) : (
          <>
            <button
              onClick={toggleMute}
              disabled={!localStream}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-700/80 transition ${
                isMuted
                  ? "bg-gray-800 text-red-400 border-red-400/40"
                  : "bg-gray-800/40 text-gray-200 hover:bg-gray-800"
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={toggleCaptions}
              className={`inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border transition ${
                captionsEnabled
                  ? "bg-blue-600/80 text-white border-blue-500/60"
                  : "bg-gray-800/40 text-gray-400 border-gray-700/80 hover:bg-gray-800"
              }`}
              title={captionsEnabled ? "Disable captions" : "Enable captions"}
            >
              <Subtitles className="w-4 h-4" />
            </button>
            <button
              onClick={endCall}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/90 hover:bg-red-600 text-white font-medium transition"
            >
              <PhoneOff className="w-4 h-4" />
              Hang up
            </button>
          </>
        )}
      </div>
      {/* Real-time captions for voice call */}
      {captionsEnabled && showCaptionText && callState === "connected" && (
        <div className="px-5 pb-3">
          <div className="bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/40">
            <p className="text-gray-400 text-xs mb-0.5">{showCaptionText.original}</p>
            <p className="text-blue-300 text-sm font-medium">{showCaptionText.translated}</p>
          </div>
        </div>
      )}
      <audio ref={remoteAudioRef} autoPlay playsInline />
      <audio ref={localAudioRef} autoPlay playsInline muted />
    </div>
  );
};

export default VoiceCallOverlay;
