// models/tokenModel.js
import pool from "../db.js";

export const storeRefreshToken = async (userId, token) => {
  const q = await pool.query("INSERT INTO refresh_tokens (user_id, token) VALUES ($1,$2) RETURNING *", [userId, token]);
  return q.rows[0];
};

export const revokeRefreshToken = async (token) => {
  const q = await pool.query("UPDATE refresh_tokens SET revoked=true WHERE token=$1 RETURNING *", [token]);
  return q.rows[0];
};

export const findRefreshToken = async (token) => {
  const q = await pool.query("SELECT * FROM refresh_tokens WHERE token=$1 AND revoked=false", [token]);
  return q.rows[0];
};

export const revokeAllForUser = async (userId) => {
  await pool.query("UPDATE refresh_tokens SET revoked=true WHERE user_id=$1", [userId]);
};
