import db from "../config/db.js";

export const UserModel = {
  create({ username, email, passwordHash }) {
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(username, email, passwordHash);
    return this.findById(info.lastInsertRowid);
  },

  findByEmail(email) {
    return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
  },

  findByUsername(username) {
    return db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
  },

  findById(id) {
    return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  },

  // Excludes password_hash — safe to send to clients
  publicById(id) {
    return db
      .prepare(
        `SELECT id, username, email, is_online, last_seen, created_at FROM users WHERE id = ?`
      )
      .get(id);
  },

  searchOthers(currentUserId, query) {
    if (query) {
      return db
        .prepare(
          `SELECT id, username, is_online, last_seen FROM users
           WHERE id != ? AND username LIKE ?
           ORDER BY username ASC LIMIT 20`
        )
        .all(currentUserId, `%${query}%`);
    }
    return db
      .prepare(
        `SELECT id, username, is_online, last_seen FROM users
         WHERE id != ?
         ORDER BY is_online DESC, username ASC LIMIT 50`
      )
      .all(currentUserId);
  },

  setOnlineStatus(id, isOnline) {
    db.prepare(
      `UPDATE users SET is_online = ?, last_seen = datetime('now') WHERE id = ?`
    ).run(isOnline ? 1 : 0, id);
  },
};
