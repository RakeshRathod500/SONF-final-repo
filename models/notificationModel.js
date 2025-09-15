// models/notificationModel.js
import pool from "../db.js";
export const listNotifications = async (userId) => {
  const q = await pool.query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
  return q.rows;
};
export const markRead = async (userId, id) => {
  const q = await pool.query("UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2 RETURNING *", [id, userId]);
  return q.rows[0];
};
export const seedNotifications = async (userId, count = 3) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    const ins = await pool.query("INSERT INTO notifications (user_id, title, body) VALUES ($1,$2,$3) RETURNING *", [userId, `Update #${i+1}`, "Hello!"]);
    items.push(ins.rows[0]);
  }
  return items;
};
