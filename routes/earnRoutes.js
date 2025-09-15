// routes/earnRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import { earnRoute } from "../controllers/earnController.js";

const router = express.Router();

/**
 * Claim reward for a specific platform
 * Platforms: telegram, youtube, twitter, instagram
 */
router.post("/:platform", auth, earnRoute);

export default router;
