// controllers/profileController.js
import poolPromise from "../db.js";

/**
 * Generate unique username using integers to ensure uniqueness
 */
async function generateUniqueUsername(pool, firstName, lastName) {
  const safeFirst = firstName ? firstName.toLowerCase().replace(/\s+/g, "") : "user";
  const safeLast = lastName ? lastName.toLowerCase().replace(/\s+/g, "") : "guest";
  let base = `${safeFirst}${safeLast}`;
  let username = base;
  let counter = 1;

  while (true) {
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (existing.rows.length === 0) break;
    username = `${base}${counter}`;
    counter++;
  }

  return username;
}

// GET /api/profile
export async function getProfile(req, res) {
  try {
    const pool = await poolPromise;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found in request" });
    }

    const userId = req.user.id;
    const result = await pool.query(
      `SELECT first_name, last_name, email, phone, username
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];
    let username = user.username;

    if (!username) {
      username = await generateUniqueUsername(pool, user.first_name, user.last_name);
      await pool.query("UPDATE users SET username = $1 WHERE id = $2", [username, userId]);
    }

    res.json({
      success: true,
      data: {
        fullName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        username,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
}

// PUT /api/profile
export async function putProfile(req, res) {
  try {
    const pool = await poolPromise;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found in request" });
    }

    const userId = req.user.id;
    const { firstName, lastName, phone } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1,
           last_name = $2,
           phone = $3
       WHERE id = $4
       RETURNING first_name, last_name, email, phone, username`,
      [firstName, lastName, phone, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];
    let username = user.username;

    if (!username) {
      username = await generateUniqueUsername(pool, user.first_name, user.last_name);
      await pool.query("UPDATE users SET username = $1 WHERE id = $2", [username, userId]);
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        fullName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        username,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
}
