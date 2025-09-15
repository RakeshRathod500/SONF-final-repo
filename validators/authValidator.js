// validators/authValidator.js
import Joi from "joi";

// --- SIGNUP VALIDATION ---
export const signupSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    full_name: Joi.string().allow("", null),
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .allow("", null)
      .messages({
        "string.alphanum": "Username must only contain letters and numbers",
        "string.min": "Username must be at least 3 characters",
        "string.max": "Username must be at most 30 characters",
      }),
  }),
});

// --- LOGIN VALIDATION ---
export const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
});

// --- REFRESH TOKEN VALIDATION ---
export const refreshSchema = Joi.object({
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
});
