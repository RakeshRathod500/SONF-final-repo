// routes/profileRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import poolPromise from "../db.js";
import { validate } from "../middleware/validate.js";
import { profileUpdateSchema } from "../validators/profileValidator.js";

const router = express.Router();

/**
 * Helper: Generate a unique username using integers for uniqueness
 */
async function generateUniqueUsername(firstName, lastName, pool) {
  const safeFirst = firstName ? firstName.toLowerCase().trim() : "user";
  const safeLast = lastName ? lastName.toLowerCase().trim() : "guest";
  let base = `${safeFirst}${safeLast}`.replace(/\s+/g, "");
  let username = base || "user";
  let counter = 1;

  while (true) {
    const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (existing.rows.length === 0) break;
    username = `${base}${counter}`;
    counter++;
  }

  return username;
}

/**
 * GET /api/profile
 */
router.get("/", auth, async (req, res) => {
  try {
    const pool = await poolPromise;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found" });
    }

    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, username, country_code
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];

    // Generate username if missing
    let username = user.username;
    if (!username) {
      username = await generateUniqueUsername(user.first_name, user.last_name, pool);
      await pool.query("UPDATE users SET username = $1 WHERE id = $2", [username, userId]);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        fullName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        username,
        email: user.email,
        phone: user.phone || "",
        countryCode: user.country_code || "",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

/**
 * PUT /api/profile
 */
router.put("/", auth, validate(profileUpdateSchema), async (req, res) => {
  try {
    const pool = await poolPromise;

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found" });
    }

    const userId = req.user.id;
    const { firstName = "", lastName = "", email, phone, countryCode } = req.body;

    // Fetch existing username
    const usernameQuery = await pool.query("SELECT username FROM users WHERE id = $1", [userId]);
    let username = usernameQuery.rows[0]?.username;

    if (!username) {
      username = await generateUniqueUsername(firstName, lastName, pool);
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name=$1, last_name=$2, email=$3, phone=$4, username=$5, country_code=$6
       WHERE id=$7
       RETURNING id, first_name, last_name, email, phone, username, country_code`,
      [firstName, lastName, email, phone, username, countryCode, userId]
    );

    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        firstName: updatedUser.first_name || "",
        lastName: updatedUser.last_name || "",
        fullName: `${updatedUser.first_name || ""} ${updatedUser.last_name || ""}`.trim(),
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        countryCode: updatedUser.country_code || "",
      },
    });
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

export default router;
