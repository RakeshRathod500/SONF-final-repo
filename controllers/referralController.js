// controllers/referralController.js
import {
  createReferral,
  listReferrals,
  countReferrals,
  countRewardedReferrals,
  checkExistingReferralByCode,
  getUserByReferralCode,
  createReferralCodeForUser
} from "../models/referralModel.js";

/**
 * 1️⃣ Send a referral invite
 */
export const postReferral = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Referral email is required" });
    }

    // Prevent self-referral
    if (email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ success: false, message: "You cannot refer yourself." });
    }

    // Prevent duplicate referral
    const existingReferral = await checkExistingReferralByCode(req.user.id, email);
    if (existingReferral) {
      return res.status(400).json({ success: false, message: "You have already referred this user." });
    }

    // Create referral (no referee_email column dependency)
    const referral = await createReferral(req.user.id);

    res.json({
      success: true,
      message: "Referral invite created successfully",
      data: referral,
    });
  } catch (err) {
    console.error("❌ Error creating referral:", err.message);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * 2️⃣ Get all referrals for logged-in user
 */
export const getReferrals = async (req, res) => {
  try {
    const referrals = await listReferrals(req.user.id);
    res.json({
      success: true,
      message: "Referrals fetched successfully",
      data: referrals,
    });
  } catch (err) {
    console.error("❌ Error fetching referrals:", err.message);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * 3️⃣ Get or generate referral code for logged-in user
 */
export const getReferralCode = async (req, res) => {
  try {
    // Fetch user by ID
    let user = await getUserByReferralCode(null, req.user.id);

    // Generate a new referral code if none exists
    if (!user.referral_code) {
      const code = `SONF${Math.floor(100000 + Math.random() * 900000)}`;
      user = await createReferralCodeForUser(req.user.id, code);
    }

    res.json({
      success: true,
      code: user.referral_code,
    });
  } catch (err) {
    console.error("❌ Error fetching referral code:", err.message);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

/**
 * 4️⃣ Referral Dashboard: stats + history
 */
export const getReferralDashboard = async (req, res) => {
  try {
    const totalReferrals = await countReferrals(req.user.id);
    const totalRewards = await countRewardedReferrals(req.user.id);
    const referrals = await listReferrals(req.user.id);

    res.json({
      success: true,
      totalReferrals,
      totalRewards,
      referrals,
    });
  } catch (err) {
    console.error("❌ Error fetching referral dashboard:", err.message);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
