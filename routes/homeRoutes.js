// routes/homeRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import poolPromise from "../db.js";

const router = express.Router();

// --- Get dashboard/home info for logged-in user ---
router.get("/", auth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    // Fetch wallet data
    const walletResult = await pool.query(
      "SELECT total_mined, available_coins, migrated_coins FROM wallets WHERE user_id=$1",
      [userId]
    );
    const wallet = walletResult.rows[0] || {
      total_mined: 0,
      available_coins: 0,
      migrated_coins: 0,
    };

    // Fetch latest mining session status
    const miningResult = await pool.query(
      "SELECT started_at FROM mining_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT 1",
      [userId]
    );
    const miningStatus = miningResult.rows.length ? "Active" : "Inactive";

    res.json({
      success: true,
      message: "Home data fetched successfully",
      data: {
        wallet,
        miningStatus,
      },
    });
  } catch (err) {
    console.error("Error fetching home data:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

export default router;
