import express from "express";
import assessmentController from "../controllers/assessmentController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Assessment CRUD
router.post("/", assessmentController.createAssessment);
router.get("/", assessmentController.listAssessments);
router.get("/:id", assessmentController.getAssessment);
router.put("/:id", assessmentController.updateAssessment);
router.delete("/:id", assessmentController.deleteAssessment);

// Answers (nested under an assessment)
router.post("/:assessmentId/answers", assessmentController.createAnswer);
router.get("/:assessmentId/answers", assessmentController.listAnswers);
router.get("/:assessmentId/answers/:answerId", assessmentController.getAnswer);
router.put(
  "/:assessmentId/answers/:answerId",
  assessmentController.updateAnswer,
);
router.delete(
  "/:assessmentId/answers/:answerId",
  assessmentController.deleteAnswer,
);
router.post(
  "/:assessmentId/answers/:answerId/assess",
  assessmentController.assessAnswer,
);

export default router;
