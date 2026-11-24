import express from "express";
const router = express.Router();
import ctrl from "../controllers/projectController.js";
import task from "../controllers/projectController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import {
  createProjectRules,
  updateProjectRules,
} from "../validators/projectValidator.js";

router.use(protect);

router.get("/", ctrl.listProjects);

router.post("/", authorize("lecturer", "admin"), ctrl.createProject);

router.get("/:id", ctrl.getProject);

router.put("/:id", authorize("lecturer", "admin"), ctrl.updateProject);

// Soft archive — reversible, notifies members
router.put("/:id/archive", authorize("lecturer", "admin"), ctrl.archiveProject);

// Hard delete — cascades groups, memberships, and user references
router.delete("/:id", authorize("lecturer", "admin"), ctrl.deleteProject);

export default router;
