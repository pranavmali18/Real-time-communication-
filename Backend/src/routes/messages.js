import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { MessageModel } from "../models/Message.js";
import { UserModel } from "../models/User.js";

const router = Router();

router.use(requireAuth);

// GET /api/messages/conversations  -> sidebar list (partner + last message + unread count)
router.get("/conversations", (req, res) => {
  const conversations = MessageModel.getConversationsForUser(req.userId);
  res.json({ conversations });
});

// GET /api/messages/:userId?limit=50&beforeId=123  -> history with one user
router.get("/:userId", (req, res) => {
  const otherUserId = Number(req.params.userId);
  if (!Number.isInteger(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const otherUser = UserModel.findById(otherUserId);
  if (!otherUser) {
    return res.status(404).json({ error: "User not found" });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const beforeId = req.query.beforeId ? Number(req.query.beforeId) : null;

  const messages = MessageModel.getConversation(req.userId, otherUserId, { limit, beforeId });

  // Mark messages from the other user as read now that this user has fetched them
  MessageModel.markAsRead(otherUserId, req.userId);

  res.json({ messages });
});

export default router;
