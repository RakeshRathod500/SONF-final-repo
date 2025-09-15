// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and attaches user payload to req.user
 */
export const auth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET);

    // Validate payload structure
    if (!payload || !payload.id || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // Attach user payload to request
    req.user = payload; // { id, email, ... }

    // Optional: you can fetch fresh user info from DB if needed for referrals
    // Example:
    // const user = await getUserById(payload.id);
    // req.user = { ...user };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);

    // Handle JWT-specific errors
    let message = "Invalid or expired token";
    if (err.name === "TokenExpiredError") {
      message = "Token has expired";
    } else if (err.name === "JsonWebTokenError") {
      message = "Malformed token";
    }

    return res.status(401).json({
      success: false,
      message,
    });
  }
};
