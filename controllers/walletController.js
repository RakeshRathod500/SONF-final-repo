// controllers/walletController.js
import poolPromise from "../db.js";

// ---- Ensure wallet exists for user ----
export const getOrCreateWallet = async (userId) => {
  const pool = await poolPromise;
  const q = await pool.query("SELECT * FROM wallets WHERE user_id=$1", [userId]);
  if (q.rows.length) return q.rows[0];

  const ins = await pool.query(
    `INSERT INTO wallets (user_id, total_mined, available_coins, migrated_coins)
     VALUES ($1, 0, 0, 0) RETURNING *`,
    [userId]
  );
  return ins.rows[0];
};

// ---- Change balances: available, migrated, total_mined ----
export const changeBalances = async (userId, availableDelta = 0, migratedDelta = 0, totalMinedDelta = 0) => {
  const pool = await poolPromise;

  const result = await pool.query(
    `UPDATE wallets
     SET available_coins = available_coins + $2,
         migrated_coins = migrated_coins + $3,
         total_mined = total_mined + $4
     WHERE user_id = $1
     RETURNING *`,
    [userId, availableDelta, migratedDelta, totalMinedDelta]
  );

  return result.rows[0];
};

// ---- Get wallet info ----
export const getWallet = async (userId) => {
  try {
    const wallet = await getOrCreateWallet(userId);
    return {
      success: true,
      message: "Wallet fetched successfully",
      data: wallet,
    };
  } catch (err) {
    console.error("Error fetching wallet:", err.message);
    return {
      success: false,
      message: "Server error",
      error: err.message,
    };
  }
};

// ---- Migrate available -> migrated coins ----
export const migrate = async (userId, amount) => {
  try {
    if (!amount || Number(amount) <= 0)
      return { success: false, message: "Valid amount required" };

    const wallet = await getOrCreateWallet(userId);
    if (Number(wallet.available_coins) < Number(amount))
      return { success: false, message: "Insufficient funds" };

    const updatedWallet = await changeBalances(userId, -Number(amount), Number(amount), 0);
    return {
      success: true,
      message: "Coins migrated successfully",
      data: updatedWallet,
    };
  } catch (err) {
    console.error("Error migrating wallet:", err.message);
    return {
      success: false,
      message: "Server error",
      error: err.message,
    };
  }
};
