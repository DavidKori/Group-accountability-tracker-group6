import { body } from "express-validator";

const createTaskRules = [
  body("title").trim().notEmpty().withMessage("Title required"),
  body("group").isMongoId().withMessage("Valid group id required"),
  body("assignedTo").optional().isMongoId(),
  body("status").optional().isIn(["todo", "in-progress", "done"]),
  body("priority").optional().isIn(["low", "medium", "high"]),
  body("dueDate").optional().isISO8601(),
];
export default createTaskRules;
