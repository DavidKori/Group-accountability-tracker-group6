import express from "express";
const router = express.Router();
import ctrl from "../controllers/adminController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

router.use(protect, authorize("admin"));

router.get("/stats", ctrl.stats);
router.get("/users", ctrl.listAllUsers);
router.put("/users/:id/toggle-active", ctrl.toggleUserActive);

export default router;
