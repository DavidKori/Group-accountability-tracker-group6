import express from "express";
const router = express.Router();
import ctrl from "../controllers/notificationController.js";
import protect from "../middlewares/authMiddleware.js";

router.use(protect);

router.get("/", ctrl.listNotifications);
router.get("/unread-count", ctrl.unreadCount);
router.put("/read-all", ctrl.markAllRead);
router.put("/:id/read", ctrl.markRead);
router.delete("/:id", ctrl.deleteNotification);

export default router;
