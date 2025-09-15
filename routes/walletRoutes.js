// routes/walletRoutes.js
import express from "express";
import poolPromise from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// ------------------ Helper Functions ------------------

// Get wallet for a user or create if it doesn't exist
const getOrCreateWallet = async (userId) => {
  try {
    const pool = await poolPromise;
    const res = await pool.query("SELECT * FROM wallets WHERE user_id=$1", [userId]);
    if (res.rows.length) return res.rows[0];

    const ins = await pool.query(
      `INSERT INTO wallets (user_id, total_mined, available_coins, migrated_coins, created_at, updated_at)
       VALUES ($1, 0, 0, 0, NOW(), NOW())
       RETURNING *`,
      [userId]
    );
    return ins.rows[0];
  } catch (err) {
    console.error("getOrCreateWallet error:", err.message);
    throw err;
  }
};

// Migrate coins from available_coins to migrated_coins
const migrateFunds = async (userId, amount) => {
  try {
    const pool = await poolPromise;
    const res = await pool.query(
      `UPDATE wallets
       SET migrated_coins = migrated_coins + $2,
           available_coins = available_coins - $2,
           updated_at = NOW()
       WHERE user_id=$1
       RETURNING *`,
      [userId, amount]
    );
    if (!res.rows.length) throw new Error("Wallet not found");
    return res.rows[0];
  } catch (err) {
    console.error("migrateFunds error:", err.message);
    throw err;
  }
};

// ------------------ Routes ------------------

// GET /api/wallet/details - fetch logged-in user's wallet
router.get("/details", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not logged in" });
    }

    const wallet = await getOrCreateWallet(userId);
    res.json({
      success: true,
      message: "Wallet fetched successfully",
      data: {
        total_mined: wallet.total_mined,
        available_coins: wallet.available_coins,
        migrated_coins: wallet.migrated_coins,
        updated_at: wallet.updated_at,
        created_at: wallet.created_at,
      },
    });
  } catch (err) {
    console.error("Error fetching wallet:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching wallet",
      error: err.message,
    });
  }
});

// POST /api/wallet/migrate - migrate coins
router.post("/migrate", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not logged in" });
    }

    const { amount } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    const wallet = await getOrCreateWallet(userId);
    if (parsedAmount > wallet.available_coins) {
      return res.status(400).json({ success: false, message: "Insufficient available coins" });
    }

    const updatedWallet = await migrateFunds(userId, parsedAmount);

    res.json({
      success: true,
      message: "Funds migrated successfully",
      data: {
        total_mined: updatedWallet.total_mined,
        available_coins: updatedWallet.available_coins,
        migrated_coins: updatedWallet.migrated_coins,
        updated_at: updatedWallet.updated_at,
        created_at: updatedWallet.created_at,
      },
    });
  } catch (err) {
    console.error("Error migrating wallet funds:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while migrating funds",
      error: err.message,
    });
  }
});

export default router;
