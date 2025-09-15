// controllers/miningController.js
import poolPromise from "../db.js";
import { changeBalances } from "../models/walletModel.js";

// Constants for reward calculation
const BASE_RATE = 0.1;          // Base coins per session
const PER_MINUTE = 0.01;        // Coins per minute
const MAX_DURATION_HOURS = 12;  // Maximum mining duration in hours

// ------------------ START MINING ------------------
export const startMining = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const activeRes = await pool.query(
      `SELECT id, started_at, total_mined
       FROM mining_sessions
       WHERE user_id=$1 AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    let session;
    if (activeRes.rows.length) {
      session = activeRes.rows[0];
    } else {
      const insertRes = await pool.query(
        `INSERT INTO mining_sessions(user_id, started_at, total_mined)
         VALUES ($1, NOW(), 0)
         RETURNING id, started_at, total_mined`,
        [userId]
      );
      session = insertRes.rows[0];
    }

    res.json({ status: "started", session });
  } catch (err) {
    console.error("Failed to start mining:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------ GET MINING STATUS ------------------
export const getMiningStatus = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const sessionRes = await pool.query(
      `SELECT id, started_at, total_mined
       FROM mining_sessions
       WHERE user_id=$1 AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!sessionRes.rows.length) {
      return res.json({ status: "inactive", elapsedSeconds: 0, coinsMined: 0 });
    }

    const session = sessionRes.rows[0];
    const startedAt = new Date(session.started_at);
    const now = new Date();
    let elapsedMs = now - startedAt;

    const maxMs = MAX_DURATION_HOURS * 60 * 60 * 1000;
    let status = "active";

    if (elapsedMs >= maxMs) {
      elapsedMs = maxMs;
      status = "completed";
    }

    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const coinsMined = Number((BASE_RATE + elapsedMinutes * PER_MINUTE).toFixed(4));

    if (status === "completed") {
      // End session
      await pool.query(
        `UPDATE mining_sessions 
         SET ended_at=NOW(), total_mined=$1 
         WHERE id=$2`,
        [coinsMined, session.id]
      );

      // Auto-credit wallet
      const updatedWallet = await changeBalances(userId, coinsMined, 0, coinsMined);

      return res.json({
        status,
        elapsedSeconds: Math.floor(elapsedMs / 1000),
        coinsMined,
        wallet: updatedWallet,
        autoCredited: true,
      });
    } else {
      // Persist mined coins periodically
      await pool.query(
        `UPDATE mining_sessions SET total_mined=$1 WHERE id=$2`,
        [coinsMined, session.id]
      );
    }

    res.json({
      status,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      coinsMined,
      autoCredited: false,
    });
  } catch (err) {
    console.error("Failed to fetch mining status:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------ STOP MINING ------------------
export const stopMining = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const sessionRes = await pool.query(
      `SELECT id, started_at, total_mined
       FROM mining_sessions
       WHERE user_id=$1 AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!sessionRes.rows.length) {
      return res.json({ status: "no_active_session" });
    }

    const session = sessionRes.rows[0];
    const startedAt = new Date(session.started_at);
    const now = new Date();

    let elapsedMinutes = Math.floor((now - startedAt) / 60000);
    if (elapsedMinutes > MAX_DURATION_HOURS * 60) {
      elapsedMinutes = MAX_DURATION_HOURS * 60;
    }

    const coinsMined = Number((BASE_RATE + elapsedMinutes * PER_MINUTE).toFixed(4));

    // End the session
    await pool.query(
      `UPDATE mining_sessions SET ended_at=NOW(), total_mined=$1 WHERE id=$2`,
      [coinsMined, session.id]
    );

    // Credit wallet
    const updatedWallet = await changeBalances(userId, coinsMined, 0, coinsMined);

    res.json({ status: "stopped", coinsMined, wallet: updatedWallet });
  } catch (err) {
    console.error("Failed to stop mining:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ------------------ CLAIM MINED COINS ------------------
// (Mainly for sessions stopped before 12h)
export const claim = async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;

    const sessionRes = await pool.query(
      `SELECT id, total_mined
       FROM mining_sessions
       WHERE user_id=$1 AND ended_at IS NOT NULL AND total_mined > 0
       ORDER BY ended_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!sessionRes.rows.length) {
      return res.json({ status: "no_claimable_session" });
    }

    const session = sessionRes.rows[0];
    const coinsToClaim = Number(session.total_mined);

    await pool.query(
      `UPDATE mining_sessions SET total_mined=0 WHERE id=$1`,
      [session.id]
    );

    const updatedWallet = await changeBalances(userId, coinsToClaim, 0, coinsToClaim);

    res.json({
      status: "claimed",
      coinsClaimed: coinsToClaim,
      wallet: updatedWallet,
    });
  } catch (err) {
    console.error("Failed to claim coins:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
