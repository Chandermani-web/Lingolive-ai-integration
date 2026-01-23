import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "../../Context/SocketContext";
import { Send, FolderUp, Menu, Smile, Mic, Globe2, Phone } from "lucide-react";
import "remixicon/fonts/remixicon.css";
import { useNavigate } from "react-router-dom";
import AppContext from "../../Context/UseContext";
import { useCall } from "../../Context/CallContext";

const ChatPage = ({ selectedUser, onOpenSidebar }) => {
  const navigate = useNavigate();
  const { messages, setMessages, onlineUsers } = useSocket();
  const { setShowImage } = useContext(AppContext);
  const { startCall, callState, activeCall } = useCall();
  const [text, setText] = useState("");
  const [editOn, setEditOn] = useState(null);
  const [media, setMedia] = useState({
    image: null,
    video: null,
    audio: null,
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [languageMap, setLanguageMap] = useState({});
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [languagesError, setLanguagesError] = useState(null);
  const [usingFallbackLanguages, setUsingFallbackLanguages] = useState(false);
  const [selectedLang, setSelectedLang] = useState(() => {
    if (typeof window === "undefined") return "original";
    return localStorage.getItem("chatTranslationLang") || "original";
  });
  const [translations, setTranslations] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [translationMeta, setTranslationMeta] = useState({});

  const chatEndRef = useRef(null);

  const isCallWithSelected = useMemo(() => {
    if (!selectedUser?._id || !activeCall?.peer?._id) return false;
    return activeCall.peer._id === selectedUser._id;
  }, [activeCall, selectedUser]);

  const callButtonDisabled = useMemo(() => {
    if (!selectedUser?._id) return true;
    if (callState === "idle") return false;
    return !isCallWithSelected;
  }, [callState, isCallWithSelected, selectedUser]);

  const callButtonLabel = useMemo(() => {
    if (!isCallWithSelected) return "Call";
    switch (callState) {
      case "incoming":
        return "Incoming…";
      case "calling":
        return "Calling…";
      case "connecting":
        return "Connecting…";
      case "connected":
        return "In call";
      default:
        return "Call";
    }
  }, [callState, isCallWithSelected]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedUser?._id) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/messages/${selectedUser._id}`,
          {
            credentials: "include",
          }
        );
        const data = await res.json();
        console.log("Fetched messages:", data);
        setMessages(data || []);
        setTranslations({});
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [selectedUser]);

  useEffect(() => {
    const fetchLanguages = async () => {
      setLanguagesLoading(true);
      setLanguagesError(null);
      try {
        const response = await fetch("http://localhost:5000/api/translation/languages", {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load languages");
        }
        const entries = Object.entries(data.languages || {});
        const sorted = entries
          .map(([code, name]) => ({ code, name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setLanguages(sorted);
        setLanguageMap(sorted.reduce((acc, item) => {
          acc[item.code] = item.name;
          return acc;
        }, {}));
        setUsingFallbackLanguages(Boolean(data.fallback));
        setSelectedLang((prev) => {
          if (prev !== "original" && !sorted.some((item) => item.code === prev)) {
            if (typeof window !== "undefined") {
              localStorage.setItem("chatTranslationLang", "original");
            }
            return "original";
          }
          return prev;
        });
      } catch (error) {
        console.error("Error fetching languages:", error);
        setUsingFallbackLanguages(false);
        setLanguagesError(error.message || "Unable to load languages");
      } finally {
        setLanguagesLoading(false);
      }
    };

    fetchLanguages();
  }, []);

  useEffect(() => {
    if (selectedLang === "original") {
      setIsTranslating(false);
      setTranslationError(null);
      return;
    }

    const messagesToTranslate = messages.filter((message) => {
      if (!message?.text || !message.text.trim()) return false;
      if (message.targetLang === selectedLang && message.translatedText) return false;
      const cached = translations[message._id];
      if (cached && cached[selectedLang]) return false;
      const status = translationMeta[message._id]?.[selectedLang];
      if (status === "pending" || status === "failed") return false;
      return true;
    });

    if (!messagesToTranslate.length) {
      setIsTranslating(false);
      return;
    }

    let ignore = false;

    setTranslationMeta((prev) => {
      if (!messagesToTranslate.length) return prev;
      const next = { ...prev };
      messagesToTranslate.forEach((msg) => {
        const current = next[msg._id] ? { ...next[msg._id] } : {};
        current[selectedLang] = "pending";
        next[msg._id] = current;
      });
      return next;
    });

    const translateBatch = async () => {
      setIsTranslating(true);
      setTranslationError(null);
      try {
        const response = await fetch("http://localhost:5000/api/translation/translate/batch", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            texts: messagesToTranslate.map((msg) => msg.text.trim()),
            targetLang: selectedLang,
            sourceLang: "auto",
          }),
        });

        const data = await response.json();

        if (ignore) return;

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Translation failed");
        }

        const translatedEntries = {};
        (data.translations || []).forEach((item, index) => {
          const targetMessage = messagesToTranslate[index];
          if (targetMessage?._id && item?.translated) {
            if (!translatedEntries[targetMessage._id]) {
              translatedEntries[targetMessage._id] = {};
            }
            translatedEntries[targetMessage._id][selectedLang] = item.translated;
          }
        });

        setTranslations((prev) => {
          const next = { ...prev };
          Object.entries(translatedEntries).forEach(([messageId, languageTranslations]) => {
            next[messageId] = {
              ...(next[messageId] || {}),
              ...languageTranslations,
            };
          });
          return next;
        });
        setTranslationMeta((prev) => {
          const next = { ...prev };
          Object.keys(translatedEntries).forEach((messageId) => {
            const current = next[messageId] ? { ...next[messageId] } : {};
            current[selectedLang] = "success";
            next[messageId] = current;
          });
          return next;
        });
      } catch (error) {
        console.error("Error translating messages:", error);
        if (!ignore) {
          setTranslationError(error.message || "Unable to translate messages");
          setTranslationMeta((prev) => {
            const next = { ...prev };
            messagesToTranslate.forEach((msg) => {
              const current = next[msg._id] ? { ...next[msg._id] } : {};
              current[selectedLang] = "failed";
              next[msg._id] = current;
            });
            return next;
          });
        }
      } finally {
        if (!ignore) {
          setIsTranslating(false);
        }
      }
    };

    translateBatch();

    return () => {
      ignore = true;
    };
  }, [messages, selectedLang]);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = file.type;
    if (type.startsWith("image"))
      setMedia({ image: file, video: null, audio: null, file: null });
    else if (type.startsWith("video"))
      setMedia({ image: null, video: file, audio: null, file: null });
    else if (type.startsWith("audio"))
      setMedia({ image: null, video: null, audio: file, file: null });
    else setMedia({ image: null, video: null, audio: null, file: file });
  };

  const sendMessage = async () => {
    if (!text.trim() && !media.image && !media.video && !media.audio && !media.file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("receiverId", selectedUser._id);
      if (text.trim()) formData.append("text", text.trim());
      if (media.image) formData.append("image", media.image);
      if (media.video) formData.append("video", media.video);
      if (media.audio) formData.append("audio", media.audio);
      if (media.file) formData.append("file", media.file);
      if (selectedLang && selectedLang !== "original") {
        formData.append("targetLang", selectedLang);
        formData.append("sourceLang", "auto");
      }

      const res = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data?.data) {
        setText("");
        setMedia({ image: null, video: null, audio: null, file: null });
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/messages/${messageId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (res.ok) {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        setEditOn(null);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLanguageChange = (event) => {
    const newValue = event.target.value;
    setSelectedLang(newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem("chatTranslationLang", newValue);
    }
  };

  const getLanguageLabel = useMemo(() => {
    return (code) => {
      if (code === "original") return "Original";
      return languageMap[code] || code?.toUpperCase();
    };
  }, [languageMap]);

  return (
    <div className="flex flex-col h-full bg-gray-900/10 backdrop-blur-xl border-l border-gray-700/10 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gray-900/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            className="md:hidden flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-gray-800/10 text-white hover:bg-gray-700/50 transition-all duration-300"
            onClick={onOpenSidebar}
            aria-label="Open chats"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
              <img
                src={selectedUser.profilePic || "/avatar.svg"}
                alt="profile"
                className="w-full h-full rounded-2xl object-cover bg-gray-800"
                onClick={()=>setShowImage(selectedUser.profilePic)}
              />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${onlineUsers.includes(selectedUser._id) ? "bg-green-400" : "bg-gray-400"
              }`}></div>
          </div>
          <div>
            <h2
              className="text-white font-bold text-xl cursor-pointer hover:text-blue-400 transition-colors"
              onClick={() => {
                navigate(`/profile/${selectedUser._id}`);
              }}
            >
              @{selectedUser.username}
            </h2>
            <p className="text-gray-400 text-sm">
              {onlineUsers.includes(selectedUser._id) ? "🟢 Online" : "🔴 Offline"}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!callButtonDisabled) {
                startCall(selectedUser);
              }
            }}
            disabled={callButtonDisabled}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 border ${
              callButtonDisabled
                ? "bg-gray-800/50 text-gray-500 border-gray-700/60 cursor-not-allowed"
                : callState !== "idle"
                ? "bg-purple-600/90 hover:bg-purple-600 text-white border-purple-500/60"
                : "bg-blue-600/90 hover:bg-blue-600 text-white border-blue-500/60"
            }`}
          >
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">{callButtonLabel}</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span>Translate to</span>
          </div>
          <div className="relative">
            <select
              value={selectedLang}
              onChange={handleLanguageChange}
              disabled={languagesLoading || !!languagesError}
              className="bg-gray-800/70 border border-gray-700/60 text-sm text-gray-100 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/60 appearance-none pr-10"
            >
              <option value="original">Show original</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 text-xs">▼</span>
          </div>
          {languagesLoading && (
            <span className="text-xs text-blue-300">Loading languages…</span>
          )}
          {languagesError && (
            <span className="text-xs text-red-400">{languagesError}</span>
          )}
          {usingFallbackLanguages && !languagesError && (
            <span className="text-xs text-amber-300">Limited list while translator reconnects</span>
          )}
          {isTranslating && selectedLang !== "original" && (
            <span className="text-xs text-blue-300">Translating…</span>
          )}
          {translationError && selectedLang !== "original" && (
            <span className="text-xs text-red-400">{translationError}</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.map((m) => {
          const senderId = typeof m.sender === "object" ? m.sender._id : m.sender;
          const isOwn = senderId !== selectedUser._id;
          const isMenuOpen = editOn === m._id;
          const originalText = m.text?.trim();
          const storedTranslationMatch =
            selectedLang !== "original" &&
            originalText &&
            m.targetLang === selectedLang &&
            m.translatedText
              ? m.translatedText
              : null;
          const cachedTranslation =
            selectedLang !== "original" && translations[m._id]
              ? translations[m._id][selectedLang]
              : null;
          const status = translationMeta[m._id]?.[selectedLang];
          const hasTranslation = Boolean(storedTranslationMatch || cachedTranslation);
          const translationText = storedTranslationMatch || cachedTranslation;
          const translationPending =
            selectedLang !== "original" &&
            !!originalText &&
            status === "pending";
          const translationFailed =
            selectedLang !== "original" &&
            !!originalText &&
            status === "failed";

          return (
            <div
              key={m._id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex items-end gap-3 max-w-[85%] ${isOwn ? "flex-row-reverse" : "flex-row"
                  }`}
              >
                {!isOwn && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 flex-shrink-0">
                    <img
                      src={selectedUser.profilePic || "/avatar.svg"}
                      alt="profile"
                      className="w-full h-full rounded-full object-cover bg-gray-800"
                    />
                  </div>
                )}
                <div
                  className={`relative group p-4 break-words ${isOwn
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-2xl"
                      : "bg-gray-800/50 text-gray-100 rounded-bl-2xl border border-gray-700/50"
                    }`}
                >
                  {/* Message menu */}
                  {isOwn && (
                    <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditOn(isMenuOpen ? null : m._id);
                        }}
                        className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-300 shadow-lg"
                      >
                        <i className="ri-more-2-line text-lg"></i>
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-0 mt-2 w-32 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => deleteMessage(m._id)}
                            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  {m.image && (
                    <img
                      src={m.image}
                      alt="sent"
                      className="mt-2 max-w-xs shadow-lg w-[200px] h-[200px] object-cover"
                      onClick={()=>setShowImage(m.image)}
                    />
                  )}
                  {m.video && (
                    <video
                      src={m.video}
                      controls
                      className="mt-2 max-w-xs shadow-lg w-[200px] h-[200px] object-cover"
                    />
                  )}
                  {m.audio && (
                    <audio src={m.audio} controls className="mt-2" />
                  )}
                  {m.file && (
                    <a
                      href={m.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mt-2 transition-colors bg-blue-500/10 px-3 py-2 rounded-xl"
                    >
                      <i className="ri-file-download-line"></i>
                      Download file
                    </a>
                  )}
                  {originalText && (
                    <div className="space-y-2">
                      <p className="text-sm leading-relaxed">
                        {selectedLang !== "original" && hasTranslation
                          ? translationText
                          : m.text}
                      </p>
                      {selectedLang !== "original" && hasTranslation && (
                        <p className="text-[11px] text-gray-200/70 italic">
                          Original: {m.text}
                        </p>
                      )}
                      {translationPending && (
                        <p className="text-[11px] text-gray-300/80 italic">
                          Translating to {getLanguageLabel(selectedLang)}…
                        </p>
                      )}
                      {translationFailed && (
                        <p className="text-[11px] text-red-300/80 italic">
                          Translation unavailable right now
                        </p>
                      )}
                    </div>
                  )}

                <span className={`text-[10px] block mt-2 text-right ${isOwn ? "text-blue-100" : "text-gray-400"
                  }`}>
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                  </div>  
              </div>
            </div>
          );
        })}

        <div ref={chatEndRef}></div>
      </div>

      {/* Media preview */}
      {(media.image || media.video || media.audio || media.file) && (
        <div className="p-4 flex items-center gap-4 border-t border-gray-700/50 bg-gray-800/30">
          {media.image && (
            <div className="relative">
              <img
                src={URL.createObjectURL(media.image)}
                alt="preview"
                className="w-20 h-20 object-cover rounded-2xl border-2 border-blue-500/50 shadow-lg"
              />
            </div>
          )}
          {media.video && (
            <div className="relative">
              <video
                src={URL.createObjectURL(media.video)}
                controls
                className="w-24 h-20 object-cover rounded-2xl border-2 border-purple-500/50 shadow-lg"
              />
            </div>
          )}
          {media.audio && (
            <div className="flex items-center gap-3 bg-gray-700/50 px-4 py-3 rounded-2xl border border-gray-600/50">
              <audio
                src={URL.createObjectURL(media.audio)}
                controls
                className="w-48"
              />
            </div>
          )}
          {media.file && (
            <div className="flex items-center gap-3 bg-gray-700/50 px-4 py-3 rounded-2xl border border-gray-600/50">
              <i className="ri-file-text-line text-blue-400 text-xl"></i>
              <p className="text-sm text-gray-300 truncate max-w-[150px]">
                {media.file.name}
              </p>
            </div>
          )}
          <button
            onClick={() => setMedia({ image: null, video: null, audio: null, file: null })}
            className="text-red-400 text-sm hover:text-red-300 transition-colors bg-red-500/10 px-3 py-2 rounded-xl"
          >
            Remove
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center gap-3 border-t border-gray-700/50 p-4 bg-gray-900/80 backdrop-blur-xl">
        <button className="p-3 text-amber-400 hover:text-amber-300 hover:bg-gray-700/50 rounded-2xl transition-all duration-300">
          <Smile className="w-6 h-6" />
        </button>

        <button
          onClick={() => document.getElementById("media").click()}
          className="p-3 text-amber-500 hover:text-amber-400 hover:bg-gray-700/50 rounded-2xl transition-all duration-300"
        >
          <FolderUp className="w-6 h-6" />
        </button>
        <input
          type="file"
          id="media"
          className="hidden"
          onChange={handleMediaChange}
          multiple={false}
        />

        <div className="flex-1 relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="w-full bg-gray-800/50 border border-gray-600/50 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 placeholder-gray-400"
          />
        </div>

        <button className="p-3 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-2xl transition-all duration-300">
          <Mic className="w-6 h-6" />
        </button>

        <button
          onClick={sendMessage}
          disabled={loading || (!text.trim() && !media.image && !media.video && !media.audio && !media.file)}
          className={`p-4 rounded-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${loading || (!text.trim() && !media.image && !media.video && !media.audio && !media.file)
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
            }`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatPage;