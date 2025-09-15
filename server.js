// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import jwt from "jsonwebtoken";
import bodyParser from "body-parser";
import poolPromise from "./db.js";

// ----- route imports -----
import authRoutes from "./routes/authRoutes.js";
import earnRoutes from "./routes/earnRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import homeRoutes from "./routes/homeRoutes.js";
import miningRoutes from "./routes/miningRoutes.js";
import userRoutes from "./routes/user.js";
import profileRoutes from "./routes/profileRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";

// ----- load environment variables -----
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const PORT = process.env.PORT || 5000;

// ----- app setup -----
const app = express(); // ✅ Must initialize before using app.use()
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan("dev"));

// ----- centralized authentication middleware -----
export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ----- root & health routes -----
app.get("/", (_req, res) => {
  res.send("🚀 Crypto Backend API is running...");
});

app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "OK" });
});

// ----- mount route modules -----
app.use("/api/auth", authRoutes);
app.use("/api/earn", auth, earnRoutes);
app.use("/api/wallet", auth, walletRoutes);
app.use("/api/home", auth, homeRoutes);
app.use("/api/mining", miningRoutes);
app.use("/api/user", userRoutes);
app.use("/api/profile", auth, profileRoutes);
app.use("/api/referrals", referralRoutes); // ✅ Mount once

// ----- 404 handler -----
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ----- global error handler -----
app.use((err, _req, res, _next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// ----- start server AFTER DB initialization -----
async function startServer() {
  try {
    const pool = await poolPromise;
    await pool.query("SELECT NOW()"); // simple DB connectivity check
    console.log("✅ Database connected & ready");

    app.listen(PORT, () =>
      console.log(`🚀 API running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
