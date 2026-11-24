import express from "express";
const router = express.Router();
import ctrl from "../controllers/userController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

router.use(protect);

// /me/* must come before /:id or Express parses "me" as an id
router.get("/me/activity", ctrl.getActivity);
router.get("/me/export", ctrl.exportData);

router.get("/", authorize("lecturer", "admin"), ctrl.listUsers);
router.get("/:id", ctrl.getUser);
router.put("/:id", ctrl.updateUser);
router.delete("/:id", authorize("lecturer", "admin"), ctrl.deleteUser);

export default router;
