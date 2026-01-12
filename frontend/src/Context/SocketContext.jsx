// src/Context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import AppContext from "./UseContext"; // import your main context

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, posts, setPosts, requests, setRequests } =
    useContext(AppContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user?._id) return;

    const newSocket = io("http://localhost:5000", {
      query: { userId: user._id },
      withCredentials: true,
      transports: ["websocket"],
    });

    setSocket(newSocket);

    // Join user room
    newSocket.emit("joinRoom", user._id);

    if (user._id) {
      newSocket.emit("addUser", user._id);
    }

    newSocket.on("newPost", (newPost) => {
      console.log("🆕 New post received via socket:", newPost);
      setPosts((prevPosts) => [newPost, ...prevPosts]);
    });

    newSocket.on("updatePost", (updatedPost) => {
      setPosts((prev) =>
        prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
      );
    });

    newSocket.on("deletePost", ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    });

    newSocket.on("friendRequest", ({ newRequest }) => {
      console.log("🆕 New friend request received via socket:", newRequest);
      setRequests((prevRequests) => [newRequest, ...prevRequests]);
    });

    // Listen for new notifications
    newSocket.on("newNotification", (notification) => {
      console.log("🔔 New notification received:", notification);
      setNotifications((prev) => [notification, ...prev]);
    });

    newSocket.on("onlineUsers", (onlineUsers) => {
      console.log("Online Users List Updated:", onlineUsers);
      setOnlineUsers(onlineUsers);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // For real time messages
  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });
    socket.on("deleteMessage", (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    return () => {
      socket.off("newMessage");
      socket.off("deleteMessage");
    };
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        posts,
        requests,
        setNotifications,
        messages,
        onlineUsers,
        setMessages,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
