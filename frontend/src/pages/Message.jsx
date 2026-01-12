import { useEffect, useState } from "react";
import FriendsSidebar from "../Components/Messages/FriendSideBar";
import ChatPage from "../Components/Messages/ChatPage";
import { MessageCircle } from "lucide-react";

const Message = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-20 w-4 h-4 bg-blue-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 left-32 w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-80 transform bg-gray-900/95 backdrop-blur-xl border-r border-gray-700/50 transition-all duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <FriendsSidebar
          selectedUser={selectedUser}
          onSelectFriend={(friend) => {
            setSelectedUser(friend);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 relative z-10">
        {selectedUser ? (
          <div className="h-full">
            <ChatPage
              selectedUser={selectedUser}
              onOpenSidebar={() => setIsSidebarOpen(true)}
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center p-6 text-gray-400">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <p className="text-xl mb-4">Select a friend to start chatting</p>
              <p className="text-gray-500 text-sm mb-6">Choose from your connections to begin messaging</p>
              <button
                className="inline-flex md:hidden items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <MessageCircle className="w-5 h-5" />
                Open Chats
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;