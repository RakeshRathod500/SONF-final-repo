// routes/miningRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  startMining,
  stopMining,
  claim,
  getMiningStatus,
} from "../controllers/miningController.js";

const router = express.Router();

/**
 * @route   POST /api/mining/start
 * @desc    Start a new mining session.
 *          If an active session exists, returns that session.
 *          Mining persists for up to 12 hours.
 * @access  Private
 */
router.post("/start", auth, startMining);

/**
 * @route   POST /api/mining/stop
 * @desc    Stop the current mining session manually.
 *          Updates total mined coins and credits wallet.
 * @access  Private
 */
router.post("/stop", auth, stopMining);

/**
 * @route   POST /api/mining/claim
 * @desc    Claim mined coins from the most recent completed session.
 *          Resets the session's total_mined after claiming.
 * @access  Private
 */
router.post("/claim", auth, claim);

/**
 * @route   GET /api/mining/status
 * @desc    Get current mining status and coins mined in real time.
 *          Auto-credits wallet if the session has reached 12 hours.
 * @access  Private
 */
router.get("/status", auth, getMiningStatus);

export default router;
