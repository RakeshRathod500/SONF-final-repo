// validators/profileValidator.js
import Joi from "joi";

export const profileUpdateSchema = Joi.object({
  body: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        "string.empty": "First name is required",
        "string.min": "First name must be at least 1 character",
        "string.max": "First name must be at most 50 characters",
      }),

    lastName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .messages({
        "string.empty": "Last name is required",
        "string.min": "Last name must be at least 1 character",
        "string.max": "Last name must be at most 50 characters",
      }),

    email: Joi.string()
      .email()
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Email must be a valid email address",
      }),

    phone: Joi.string()
      .pattern(/^\d{10,15}$/)
      .allow("", null)
      .messages({
        "string.pattern.base": "Phone number must be 10-15 digits",
      }),

    countryCode: Joi.string()
      .pattern(/^\+\d{1,4}$/)
      .allow("", null)
      .messages({
        "string.pattern.base": "Country code must start with + and contain 1-4 digits",
      }),
  }),
});
