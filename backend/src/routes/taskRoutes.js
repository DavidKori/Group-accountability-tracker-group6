import express from "express";
const router = express.Router();
import ctrl from "../controllers/taskController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

router.use(protect);

router.get("/", ctrl.listTasks);
router.post("/", authorize("lecturer"), ctrl.createTask);
router.get("/:id", ctrl.getTask);
router.put("/:id", ctrl.updateTask);
router.delete("/:id", authorize("lecturer"), ctrl.deleteTask);

export default router;
