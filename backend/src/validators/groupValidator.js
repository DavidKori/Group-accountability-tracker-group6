import { body } from "express-validator";

export const createGroupRules = [
  body("name").trim().notEmpty().withMessage("Group name required"),
  body("project").isMongoId().withMessage("Valid project id required"),
  body("members").optional().isArray(),
];

export const addMemberRules = [
  body("userId").isMongoId().withMessage("Valid user id required"),
];
