import express from "express";
import moduleController from "../controllers/moduleController.js";
import protect from "../middlewares/authMiddleware.js"; // your existing auth guard

const router = express.Router();

router.use(protect); // every route below requires a logged-in user

// CRUD
router.post("/", moduleController.createModule);
router.get("/", moduleController.listModules);
router.get("/:id", moduleController.getModule);
router.put("/:id", moduleController.updateModule);
router.delete("/:id", moduleController.deleteModule);

// Students
router.post("/:id/students", moduleController.enrollStudents);
router.delete("/:id/students/:studentId", moduleController.removeStudent);

// Groups
router.post("/:id/groups", moduleController.addGroup);
router.delete("/:id/groups/:groupId", moduleController.removeGroup);

export default router;
