// controllers/earnController.js
import poolPromise from "../db.js";

// ----------------- Award rewards if not already awarded -----------------
export const earn = async (userId, platform, link = null) => {
  const allowed = ["telegram", "youtube", "twitter", "instagram"];
  if (!allowed.includes(platform)) {
    return { success: false, message: "Invalid platform" };
  }

  try {
    const pool = await poolPromise;

    // ✅ Check if already awarded for this platform
    const check = await pool.query(
      `SELECT * FROM earn_rewards WHERE user_id=$1 AND platform=$2`,
      [userId, platform]
    );

    if (check.rows.length) {
      return {
        success: true,
        awarded: false,
        message: `Reward already claimed for ${platform}`,
      };
    }

    // ✅ Decide reward amount
    let rewardAmount = 0;
    if (platform === "telegram" || platform === "youtube") {
      rewardAmount = 0.5;
    } else if (platform === "twitter" || platform === "instagram") {
      if (!link) {
        return {
          success: false,
          message: "Post/Tweet link is required for this platform",
        };
      }
      rewardAmount = 1;
    }

    // ✅ Insert reward record
    await pool.query(
      `INSERT INTO earn_rewards (user_id, platform, reward_amount, link, claimed, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, platform, rewardAmount, link || null, true]
    );

    // ✅ Update wallet balance
    const walletUpdate = await pool.query(
      `UPDATE wallets
       SET available_coins = available_coins + $2
       WHERE user_id = $1
       RETURNING *`,
      [userId, rewardAmount]
    );

    return {
      success: true,
      awarded: true,
      message: `Rewarded ${rewardAmount} coins for ${platform}`,
      rewardAmount,
      wallet: walletUpdate.rows[0],
    };
  } catch (err) {
    console.error("Error awarding earn reward:", err.message);
    return { success: false, message: "Server error", error: err.message };
  }
};

// ----------------- Express route wrapper -----------------
export const earnRoute = async (req, res) => {
  const { platform } = req.params;
  const { link } = req.body; // optional for Telegram/YouTube, required for Twitter/Instagram
  const result = await earn(req.user.id, platform, link);
  res.json(result);
};
