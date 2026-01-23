import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDB from "./database/index.db.js";
import dotenv from "dotenv";

dotenv.config();
const PORT = process.env.PORT || 5000;

// Create server and Socket.io instance first
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

export let onlineUsers = new Map();

// Handle user connections
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log("Online Users:", onlineUsers);
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  socket.on("call:offer", ({ targetId, offer, caller }) => {
    if (!targetId || !offer || !caller) return;
    const targetSocketId = onlineUsers.get(targetId);
    if (!targetSocketId) {
      socket.emit("call:unavailable", { targetId });
      return;
    }
    io.to(targetSocketId).emit("call:incoming", {
      from: caller._id,
      caller,
      offer,
    });
  });

  socket.on("call:answer", ({ targetId, answer }) => {
    if (!targetId || !answer) return;
    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:answered", { answer });
    }
  });

  socket.on("call:ice-candidate", ({ targetId, candidate }) => {
    if (!targetId || !candidate) return;
    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ice-candidate", { candidate });
    }
  });

  socket.on("call:decline", ({ targetId }) => {
    if (!targetId) return;
    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:declined");
    }
  });

  socket.on("call:end", ({ targetId, reason }) => {
    if (!targetId) return;
    const targetSocketId = onlineUsers.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("call:ended", { reason: reason || "ended" });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
    for (let [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });
});


// Connect DB and start server
connectDB()
  .then(() => {
    server.listen(PORT, "0.0.0.0" , () => {
      console.log(`Server running on http://localhost:0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("Failed to connect to DB", err);
  });
