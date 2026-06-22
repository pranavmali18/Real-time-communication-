import db from "../config/db.js";

export const MessageModel = {
  create({ senderId, receiverId, content }) {
    const stmt = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(senderId, receiverId, content);
    return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(info.lastInsertRowid);
  },

  // Full conversation history between two users, oldest first, with simple pagination
  getConversation(userA, userB, { limit = 50, beforeId = null } = {}) {
    if (beforeId) {
      const rows = db
        .prepare(
          `SELECT * FROM messages
           WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
             AND id < ?
           ORDER BY id DESC LIMIT ?`
        )
        .all(userA, userB, userB, userA, beforeId, limit);
      return rows.reverse();
    }
    const rows = db
      .prepare(
        `SELECT * FROM messages
         WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
         ORDER BY id DESC LIMIT ?`
      )
      .all(userA, userB, userB, userA, limit);
    return rows.reverse();
  },

  markAsRead(senderId, receiverId) {
    db.prepare(
      `UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`
    ).run(senderId, receiverId);
  },

  // List of conversation partners + last message, for a sidebar/contact list
  getConversationsForUser(userId) {
    return db
      .prepare(
        `
      SELECT
        u.id AS partnerId,
        u.username AS partnerUsername,
        u.is_online AS isOnline,
        u.last_seen AS lastSeen,
        m.content AS lastMessage,
        m.created_at AS lastMessageAt,
        m.sender_id AS lastMessageSenderId,
        (
          SELECT COUNT(*) FROM messages
          WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
        ) AS unreadCount
      FROM users u
      JOIN messages m ON m.id = (
        SELECT id FROM messages
        WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
        ORDER BY id DESC LIMIT 1
      )
      WHERE u.id != ?
      ORDER BY m.created_at DESC
    `
      )
      .all(userId, userId, userId, userId);
  },
};
