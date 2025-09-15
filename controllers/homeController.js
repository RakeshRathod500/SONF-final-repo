// controllers/homeController.js
import poolPromise from "../db.js";

// ---- Fetch home/dashboard data for logged-in user ----
export const getHomeData = async (userId) => {
  try {
    const pool = await poolPromise;

    // Fetch wallet details
    const walletRes = await pool.query(
      `SELECT total_mined, available_coins, migrated_coins 
       FROM wallets WHERE user_id = $1`,
      [userId]
    );
    const wallet = walletRes.rows[0] || {
      total_mined: 0,
      available_coins: 0,
      migrated_coins: 0,
    };

    // Fetch referral count
    const referralRes = await pool.query(
      `SELECT COUNT(*) FROM referrals WHERE referrer_id = $1`,
      [userId]
    );
    const referralCount = parseInt(referralRes.rows[0]?.count || 0, 10);

    // Fetch latest mining session
    const miningRes = await pool.query(
      `SELECT started_at, ended_at, total_mined
       FROM mining_sessions 
       WHERE user_id = $1 
       ORDER BY started_at DESC 
       LIMIT 1`,
      [userId]
    );

    let miningStatus = "Inactive";
    let latestSessionCoins = 0;

    if (miningRes.rows.length) {
      const session = miningRes.rows[0];
      miningStatus = session.ended_at ? "Inactive" : "Active";
      latestSessionCoins = Number(session.total_mined) || 0;
    }

    // Fetch total mined across all sessions
    const minedRes = await pool.query(
      `SELECT COALESCE(SUM(total_mined), 0) AS total_mined
       FROM mining_sessions
       WHERE user_id=$1`,
      [userId]
    );
    const totalMinedOverall = Number(minedRes.rows[0]?.total_mined || 0);

    return {
      success: true,
      message: "Home data fetched successfully",
      data: {
        wallet,                     // from wallets table
        referralCount,              // total referrals
        miningStatus,               // Active / Inactive
        latestSessionCoins,         // coins in the most recent session
        totalMinedOverall,          // all-time mined coins
      },
    };
  } catch (err) {
    console.error("Error fetching home data:", err.message);
    return {
      success: false,
      message: "Server error",
      error: err.message,
    };
  }
};

// ---- Express route wrapper ----
export const homeRoute = async (req, res) => {
  const result = await getHomeData(req.user.id);
  res.json(result);
};
