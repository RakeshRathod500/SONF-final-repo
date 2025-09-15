// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import poolPromise from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "change-refresh";

// ---- helper to sign tokens ----
const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30m" });

const signRefreshToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: "30d" });

// ---- ensure wallet exists for user ----
const getOrCreateWallet = async (userId, initialCoins = 0) => {
  const pool = await poolPromise;
  const q = await pool.query("SELECT * FROM wallets WHERE user_id=$1", [userId]);
  if (q.rows.length) return q.rows[0];

  const ins = await pool.query(
    `INSERT INTO wallets (user_id, total_mined, available_coins, migrated_coins, created_at, updated_at)
     VALUES ($1, 0, $2, 0, NOW(), NOW()) RETURNING *`,
    [userId, initialCoins]
  );
  return ins.rows[0];
};

// ---- CHANGE BALANCES ----
const changeBalances = async (userId, deltaAvailable = 0, deltaMigrated = 0, deltaTotal = 0) => {
  const pool = await poolPromise;
  const result = await pool.query(
    `UPDATE wallets
     SET available_coins = available_coins + $2,
         migrated_coins  = migrated_coins + $3,
         total_mined     = total_mined + $4,
         updated_at      = NOW()
     WHERE user_id=$1
     RETURNING *`,
    [userId, deltaAvailable, deltaMigrated, deltaTotal]
  );
  return result.rows[0];
};

// ---- SIGNUP ----
export const signup = async (req, res) => {
  try {
    const { email, password, full_name, username, referralCode } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email & password required" });
    }

    const pool = await poolPromise;

    // Hash password
    const pwdHash = await bcrypt.hash(password, 10);

    // Insert new user
    const userInsert = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, username, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, email, full_name, username, created_at`,
      [email, pwdHash, full_name || null, username || null]
    );

    const user = userInsert.rows[0];
    let initialCoins = 0;

    // -----------------------
    // Referral / referralCode bonus
    // -----------------------
    if (referralCode) {
      const referrerRes = await pool.query(
        "SELECT id FROM users WHERE referral_code=$1",
        [referralCode]
      );

      if (referrerRes.rows.length) {
        const referrerId = referrerRes.rows[0].id;

        // Add 1 coin to both wallets
        await Promise.all([
          changeBalances(referrerId, 1, 0, 0),
          changeBalances(user.id, 1, 0, 0)
        ]);

        // Insert referral record
        await pool.query(
          `INSERT INTO referrals (referrer_id, referee_id, reward_awarded, created_at)
           VALUES ($1, $2, true, NOW())`,
          [referrerId, user.id]
        );

        initialCoins = 1; // new user wallet will start with 1 coin
      }
    }

    // Create wallet for new user
    await getOrCreateWallet(user.id, initialCoins);

    // Sign tokens
    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({
      success: true,
      message: "Signup successful",
      data: { token, refreshToken, user },
    });
  } catch (e) {
    const errMsg = e.message || "";
    if (errMsg.includes("users_email_key"))
      return res.status(409).json({ success: false, message: "Email already exists" });
    if (errMsg.includes("users_username_key"))
      return res.status(409).json({ success: false, message: "Username already exists" });

    console.error("Signup error:", e.message);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ---- LOGIN ----
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = await poolPromise;

    const q = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (!q.rows.length) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          username: user.username,
          created_at: user.created_at,
        },
      },
    });
  } catch (e) {
    console.error("Login error:", e.message);
    res.status(500).json({ success: false, message: "Server error", error: e.message });
  }
};

// ---- REFRESH TOKEN ----
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: "No refresh token" });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const pool = await poolPromise;
    const q = await pool.query("SELECT * FROM users WHERE id=$1", [decoded.id]);
    if (!q.rows.length) return res.status(401).json({ success: false, message: "Invalid refresh token" });

    const token = signToken(q.rows[0]);
    res.json({ success: true, message: "Token refreshed", data: { token } });
  } catch (e) {
    console.error("Refresh token error:", e.message);
    res.status(401).json({ success: false, message: "Invalid refresh token", error: e.message });
  }
};

// ---- LOGOUT ----
export const logout = async (_req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
};
