import express from "express";
const router = express.Router();
import ctrl from "../controllers/commentController.js";
import protect from "../middlewares/authMiddleware.js";

router.use(protect);

router.get("/task/:taskId", ctrl.listComments);
router.post("/", ctrl.addComment);
router.delete("/:id", ctrl.deleteComment);

export default router;
