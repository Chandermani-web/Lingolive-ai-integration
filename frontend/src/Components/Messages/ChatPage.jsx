import { useContext, useEffect, useRef, useState } from "react";
import { useSocket } from "../../Context/SocketContext";
import { Send, FolderUp, Menu, Smile, Mic } from "lucide-react";
import "remixicon/fonts/remixicon.css";
import { useNavigate } from "react-router-dom";
import AppContext from "../../Context/UseContext";

const ChatPage = ({ selectedUser, onOpenSidebar }) => {
  const navigate = useNavigate();
  const { messages, setMessages, onlineUsers } = useSocket();
  const { setShowImage } = useContext(AppContext);
  const [text, setText] = useState("");
  const [editOn, setEditOn] = useState(null);
  const [media, setMedia] = useState({
    image: null,
    video: null,
    audio: null,
    file: null,
  });
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

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
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [selectedUser]);

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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.map((m) => {
          const senderId = typeof m.sender === "object" ? m.sender._id : m.sender;
          const isOwn = senderId !== selectedUser._id;
          const isMenuOpen = editOn === m._id;

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
                  {m.text && <p className="text-sm leading-relaxed">{m.text}</p>}

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