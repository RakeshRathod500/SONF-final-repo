// models/walletModel.js
import pool from "../db.js";

// ---- Ensure wallet exists for a user ----
export const getOrCreateWallet = async (userId) => {
  try {
    const q = await pool.query("SELECT * FROM wallets WHERE user_id=$1", [userId]);
    if (q.rows.length) {
      return { success: true, data: q.rows[0], message: "Wallet fetched" };
    }

    const ins = await pool.query(
      `INSERT INTO wallets (user_id, total_mined, available_coins, migrated_coins)
       VALUES ($1, 0, 0, 0) RETURNING *`,
      [userId]
    );

    return { success: true, data: ins.rows[0], message: "Wallet created" };
  } catch (err) {
    console.error("getOrCreateWallet error:", err.message);
    return { success: false, message: "DB error", error: err.message };
  }
};

// ---- Update wallet amounts (set absolute values) ----
export const updateWalletAmounts = async (
  userId,
  { total_mined, available_coins, migrated_coins }
) => {
  try {
    const q = await pool.query(
      `UPDATE wallets
       SET total_mined=$2,
           available_coins=$3,
           migrated_coins=$4,
           updated_at=NOW()
       WHERE user_id=$1 RETURNING *`,
      [userId, total_mined, available_coins, migrated_coins]
    );

    return { success: true, data: q.rows[0], message: "Wallet updated" };
  } catch (err) {
    console.error("updateWalletAmounts error:", err.message);
    return { success: false, message: "DB error", error: err.message };
  }
};

// ---- Increment/decrement balances ----
export const changeBalances = async (
  userId,
  deltaAvailable = 0,
  deltaMigrated = 0,
  deltaTotal = 0
) => {
  try {
    const q = await pool.query(
      `UPDATE wallets
       SET available_coins = available_coins + $2,
           migrated_coins  = migrated_coins + $3,
           total_mined = total_mined + $4,
           updated_at = NOW()
       WHERE user_id=$1 RETURNING *`,
      [userId, deltaAvailable, deltaMigrated, deltaTotal]
    );

    return { success: true, data: q.rows[0], message: "Balances updated" };
  } catch (err) {
    console.error("changeBalances error:", err.message);
    return { success: false, message: "DB error", error: err.message };
  }
};

// ---- Credit mining rewards (available + total_mined) ----
export const creditMiningRewards = async (userId, coins) => {
  if (!coins || coins <= 0) {
    return { success: false, message: "Invalid reward amount" };
  }
  return changeBalances(userId, coins, 0, coins);
};

// ---- Transaction-safe credit with logging ----
export const creditWithTransaction = async (userId, amount) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update wallet
    const wallet = await client.query(
      `UPDATE wallets
       SET available_coins = available_coins + $2,
           total_mined = total_mined + $2,
           updated_at = NOW()
       WHERE user_id=$1 RETURNING *`,
      [userId, amount]
    );

    // Log into transactions table
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, "credit", amount]
    );

    await client.query("COMMIT");
    return { success: true, data: wallet.rows[0], message: "Coins credited" };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("creditWithTransaction error:", err.message);
    return { success: false, message: "Transaction failed", error: err.message };
  } finally {
    client.release();
  }
};
