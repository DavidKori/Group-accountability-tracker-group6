import express from "express";
const router = express.Router();
import ctrl from "../controllers/submissionController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createSubmissionRules,
  reviewSubmissionRules,
} from "../validators/submissionValidator.js";

router.use(protect);

router.get("/", ctrl.listSubmissions);
router.post("/", validate(createSubmissionRules), ctrl.createSubmission);
router.get("/:id", ctrl.getSubmission);
router.put(
  "/:id/review",
  authorize("lecturer", "admin"),
  validate(reviewSubmissionRules),
  ctrl.reviewSubmission,
);

export default router;
