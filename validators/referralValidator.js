// validators/referralValidator.js
import Joi from "joi";

export const referralSchema = Joi.object({
  body: Joi.object({
    referral_code: Joi.string()
      .pattern(/^SONF\d{6}$/) // SONF followed by 6 digits
      .required()
      .messages({
        "string.pattern.base": "Referral code must be in the format SONFXXXXXX",
        "string.empty": "Referral code is required",
      }),
  }),
});
