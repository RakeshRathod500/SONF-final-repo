// models/userModel.js
import pool from "../db.js";

export const createUser = async ({ email, full_name, username }) => {
  const q = await pool.query(
    `INSERT INTO users (email, full_name, username)
     VALUES ($1,$2,$3) RETURNING id, email, full_name, username, created_at`,
    [email, full_name || null, username || null]
  );
  return q.rows[0];
};

export const findByEmail = async (email) => {
  const q = await pool.query(`SELECT * FROM users WHERE email=$1`, [email]);
  return q.rows[0];
};

export const findById = async (id) => {
  const q = await pool.query(`SELECT id, email, full_name, username, created_at FROM users WHERE id=$1`, [id]);
  return q.rows[0];
};

export const updateProfile = async (id, { full_name, username }) => {
  const q = await pool.query(
    `UPDATE users SET full_name=$2, username=$3 WHERE id=$1 RETURNING id, email, full_name, username, created_at`,
    [id, full_name || null, username || null]
  );
  return q.rows[0];
};
