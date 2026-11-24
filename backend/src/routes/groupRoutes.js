import express from "express";
const router = express.Router();
import ctrl from "../controllers/groupController.js";
import protect from "../middlewares/authMiddleware.js";

router.use(protect);
router.post("/", ctrl.createGroup);
router.get("/", ctrl.listGroups);
router.get("/:id", ctrl.getGroup);
router.put("/:id", ctrl.updateGroup);
router.delete("/:id", ctrl.deleteGroup);

router.post("/:id/members", ctrl.addMember);
router.delete("/:id/members/:userId", ctrl.removeMember);

router.get("/:id/subtasks", ctrl.listSubtasks);
router.post("/:id/subtasks", ctrl.createSubtask);
router.put("/:id/subtasks/:subtaskId", ctrl.updateSubtask);
router.delete("/:id/subtasks/:subtaskId", ctrl.deleteSubtask);

export default router;
