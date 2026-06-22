import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { UserModel } from "../models/User.js";
import { MessageModel } from "../models/Message.js";

// userId -> Set of socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map();

function addOnlineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
  return onlineUsers.get(userId).size === 1; // true if user just came online
}

function removeOnlineSocket(userId, socketId) {
  const set = onlineUsers.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    onlineUsers.delete(userId);
    return true; // true if user just went fully offline
  }
  return false;
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  // --- Authenticate every socket connection using the JWT ---
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Join a personal room so we can target this user from anywhere (e.g. REST hooks)
    socket.join(`user:${userId}`);

    const justCameOnline = addOnlineSocket(userId, socket.id);
    if (justCameOnline) {
      UserModel.setOnlineStatus(userId, true);
      socket.broadcast.emit("user:online", { userId });
    }

    // --- Send direct message ---
    socket.on("message:send", ({ receiverId, content }, ack) => {
      try {
        if (!receiverId || !content || !content.trim()) {
          return ack?.({ error: "receiverId and content are required" });
        }

        const message = MessageModel.create({
          senderId: userId,
          receiverId,
          content: content.trim(),
        });

        // Deliver to receiver if online (any of their open tabs/devices)
        io.to(`user:${receiverId}`).emit("message:new", message);
        // Echo back to sender (so other tabs of the sender stay in sync too)
        io.to(`user:${userId}`).emit("message:new", message);

        ack?.({ message });
      } catch (err) {
        console.error("message:send error:", err);
        ack?.({ error: "Failed to send message" });
      }
    });

    // --- Typing indicators ---
    socket.on("typing:start", ({ receiverId }) => {
      if (receiverId) io.to(`user:${receiverId}`).emit("typing:start", { userId });
    });
    socket.on("typing:stop", ({ receiverId }) => {
      if (receiverId) io.to(`user:${receiverId}`).emit("typing:stop", { userId });
    });

    // --- Read receipts ---
    socket.on("messages:read", ({ partnerId }) => {
      if (!partnerId) return;
      MessageModel.markAsRead(partnerId, userId);
      io.to(`user:${partnerId}`).emit("messages:read", { readBy: userId });
    });

    // --- Disconnect / presence cleanup ---
    socket.on("disconnect", () => {
      const justWentOffline = removeOnlineSocket(userId, socket.id);
      if (justWentOffline) {
        UserModel.setOnlineStatus(userId, false);
        socket.broadcast.emit("user:offline", { userId, lastSeen: new Date().toISOString() });
      }
    });
  });

  return io;
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}
