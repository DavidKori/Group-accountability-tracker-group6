import { body } from "express-validator";

export const createProjectRules = [
  body("title").trim().notEmpty().withMessage("Title required"),
  body("deadline").optional().isISO8601().withMessage("Invalid date"),
];

export const updateProjectRules = [
  body("title").optional().trim().notEmpty(),
  body("status").optional().isIn(["active", "archived"]),
];
