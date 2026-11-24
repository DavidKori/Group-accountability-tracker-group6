import express from "express";
const router = express.Router();
import ctrl from "../controllers/lecturerController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

router.use(protect, authorize("lecturer", "admin"));

router.get("/overview", ctrl.overview);
router.get("/pending-submissions", ctrl.pendingSubmissions);

export default router;
