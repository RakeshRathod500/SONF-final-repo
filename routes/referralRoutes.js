// routes/referralRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  postReferral,
  getReferrals,
  getReferralCode,
  getReferralDashboard,
} from "../controllers/referralController.js";

// ✅ Create router instance
const router = express.Router();

/**
 * 1️⃣ Send Referral Invite
 * Backend automatically creates a referral for the logged-in user.
 * No email or code is required from frontend.
 */
router.post("/invite", auth, postReferral);

/**
 * 2️⃣ Get All Referrals for Logged-in User
 */
router.get("/list", auth, getReferrals);

/**
 * 3️⃣ Get or Generate Referral Code for logged-in user
 */
router.get("/code", auth, getReferralCode);

/**
 * 4️⃣ Referral Dashboard (Stats + History)
 */
router.get("/dashboard", auth, getReferralDashboard);

// ✅ Export router
export default router;
