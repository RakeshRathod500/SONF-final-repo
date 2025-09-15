// models/referralModel.js
import poolPromise from "../db.js";

/**
 * 1️⃣ Create a new referral
 * @param {number} referrerId - ID of the user sending the referral
 * @param {number} refereeId - ID of the user being referred
 */
export const createReferral = async (referrerId, refereeId) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `INSERT INTO referrals (referrer_id, referee_id, reward_awarded)
     VALUES ($1, $2, false)
     RETURNING id, referrer_id, referee_id, reward_awarded, created_at`,
    [referrerId, refereeId]
  );
  return result.rows[0];
};

/**
 * 2️⃣ Get all referrals made by a user
 */
export const listReferrals = async (referrerId) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `SELECT r.id, u.email AS referee_email, r.reward_awarded, r.created_at
     FROM referrals r
     LEFT JOIN users u ON u.id = r.referee_id
     WHERE r.referrer_id=$1
     ORDER BY r.created_at DESC`,
    [referrerId]
  );
  return result.rows;
};

/**
 * 3️⃣ Count total referrals for a user
 */
export const countReferrals = async (referrerId) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `SELECT COUNT(*) AS total FROM referrals WHERE referrer_id=$1`,
    [referrerId]
  );
  return parseInt(result.rows[0].total, 10);
};

/**
 * 4️⃣ Count rewarded referrals
 */
export const countRewardedReferrals = async (referrerId) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `SELECT COUNT(*) AS rewarded FROM referrals WHERE referrer_id=$1 AND reward_awarded=true`,
    [referrerId]
  );
  return parseInt(result.rows[0].rewarded, 10);
};

/**
 * 5️⃣ Mark a referral as rewarded
 */
export const markRewarded = async (referralId) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `UPDATE referrals SET reward_awarded = true
     WHERE id=$1
     RETURNING id, referrer_id, referee_id, reward_awarded, created_at`,
    [referralId]
  );
  return result.rows[0];
};

/**
 * 6️⃣ Check if a referral already exists between a referrer and referee
 */
export const checkExistingReferralByCode = async (referrerId, refereeId) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `SELECT id FROM referrals
     WHERE referrer_id=$1 AND referee_id=$2
     LIMIT 1`,
    [referrerId, refereeId]
  );
  return result.rows[0];
};

/**
 * 7️⃣ Get user by referral code or by user ID
 */
export const getUserByReferralCode = async (code = null, userId = null) => {
  const pool = await poolPromise;

  if (code) {
    const result = await pool.query(
      `SELECT id, referral_code, email FROM users WHERE referral_code=$1 LIMIT 1`,
      [code]
    );
    return result.rows[0];
  }

  if (userId) {
    const result = await pool.query(
      `SELECT id, referral_code, email FROM users WHERE id=$1 LIMIT 1`,
      [userId]
    );
    return result.rows[0];
  }

  return null;
};

/**
 * 8️⃣ Create a referral code for a user (if they don't have one)
 */
export const createReferralCodeForUser = async (userId, code) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `UPDATE users SET referral_code=$1 WHERE id=$2 RETURNING id, referral_code, email`,
    [code, userId]
  );
  return result.rows[0];
};
