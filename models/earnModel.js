// models/earnModel.js
import pool from "../db.js";
export const awardIfNotAwarded = async (userId, platform, rewardAmount) => {
  // returns { awarded: boolean, wallet: walletRow or null }
  try {
    // attempt to insert a row into earn_rewards table (unique(user_id, platform))
    const ins = await pool.query("INSERT INTO earn_rewards (user_id, platform) VALUES ($1,$2) RETURNING *", [userId, platform]);
    // if inserted, add to wallet
    const up = await pool.query(
      `UPDATE wallets SET available_coins = available_coins + $2, total_mined = total_mined + $2, updated_at = NOW() WHERE user_id=$1 RETURNING *`,
      [userId, rewardAmount]
    );
    return { awarded: true, wallet: up.rows[0] };
  } catch (err) {
    // if unique constraint violated => already awarded
    return { awarded: false };
  }
};
