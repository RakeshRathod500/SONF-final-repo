// routes/user.js

import express from "express";
import poolPromise from "../db.js"; // notice it's a promise
import { auth } from "../middleware/auth.js";

const router = express.Router();

/**
 * Utility: generate unique username with integer suffix
 * Example: john.doe123
 */
async function generateUniqueUsername(pool, firstName, lastName) {
  const base = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "");
  let username = "";
  let isUnique = false;

  while (!isUnique) {
    // Generate random integer suffix between 10 and 9999
    const randomInt = Math.floor(Math.random() * (9999 - 10 + 1)) + 10;
    username = `${base}${randomInt}`;

    const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
    if (existing.rowCount === 0) {
      isUnique = true;
    }
  }

  return username;
}

/**
 * Save or update user details
 */
router.post("/details", auth, async (req, res) => {
  const { firstName, lastName, dob, countryCode, phone } = req.body;
  const userId = req.user.id;

  if (!firstName || !lastName || !dob || !countryCode || !phone) {
    return res.status(400).json({
      success: false,
      message: "All fields (firstName, lastName, dob, countryCode, phone) are required",
    });
  }

  // Validate YYYY-MM-DD
  const dobPattern = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
  if (!dobPattern.test(dob)) {
    return res.status(400).json({
      success: false,
      message: "Date of Birth must be in YYYY-MM-DD format",
    });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Phone number must be exactly 10 digits",
    });
  }

  try {
    const pool = await poolPromise;
    const fullName = `${firstName} ${lastName}`.trim();

    // Fetch existing username
    const existing = await pool.query("SELECT username FROM users WHERE id = $1", [userId]);
    let username = existing.rows[0]?.username;

    if (!username) {
      username = await generateUniqueUsername(pool, firstName, lastName);
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1,
           last_name = $2,
           full_name = $3,
           dob = $4,
           country_code = $5,
           phone = $6,
           username = $7
       WHERE id = $8
       RETURNING id, first_name, last_name, full_name, dob, country_code, phone, username`,
      [firstName, lastName, fullName, dob, countryCode, phone, username, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      message: "User details saved successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error saving user details:", err);
    res.status(500).json({ success: false, message: "Database error: " + err.message });
  }
});

export default router;
