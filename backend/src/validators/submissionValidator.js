import { body } from "express-validator";

export const createSubmissionRules = [
  body("task").isMongoId().withMessage("Valid task id required"),
  body("content").optional().isString(),
  body("fileUrl").optional().isString(),
];

export const reviewSubmissionRules = [
  body("status").isIn(["approved", "rejected"]).withMessage("Invalid status"),
  body("feedback").optional().isString(),
];
