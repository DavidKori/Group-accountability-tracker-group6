import { validationResult } from "express-validator";

const validate = (rules) => async (req, res, next) => {
  await Promise.all(rules.map((rule) => rule.run(req)));
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(422).json({
    message: "Validation failed",
    errors: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
  });
};

export default validate;
