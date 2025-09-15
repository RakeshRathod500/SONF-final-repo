// middleware/rateLimiter.js
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

export const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false
});
