// middleware/validate.js
export const validate = (schema) => (req, res, next) => {
  // Combine all inputs to validate
  const dataToValidate = {
    body: req.body,
    params: req.params,
    query: req.query
  };

  const { error } = schema.validate(dataToValidate, { abortEarly: false });

  if (error) {
    const errors = error.details.map(d => d.message);
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors
    });
  }

  next();
};
