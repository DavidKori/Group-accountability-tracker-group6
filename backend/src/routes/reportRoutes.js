import express from "express";
const router = express.Router();
import ctrl from "../controllers/reportController.js";
import protect from "../middlewares/authMiddleware.js";
import authorize from "../middlewares/roleMiddleware.js";

router.use(protect);

// ── Live contribution snapshot (no persistence) ────────────────────
// Lecturers, admins, and leaders can preview their group's numbers.
router.get(
  "/group/:groupId/preview",
  authorize("lecturer", "admin", "leader"),
  ctrl.previewReport,
);

// ── Latest/on-demand contribution report for a group ───────────────
router.get(
  "/group/:groupId",
  authorize("lecturer", "admin", "leader"),
  ctrl.groupReport,
);

// ── Generate and persist a new report snapshot ─────────────────────
router.post(
  "/group/:groupId",
  authorize("lecturer", "admin", "leader"),
  ctrl.generateReport,
);

// ── Past report snapshots for a group ──────────────────────────────
router.get(
  "/group/:groupId/history",
  authorize("lecturer", "admin", "leader"),
  ctrl.listReports,
);

// ── Single report by id ────────────────────────────────────────────
router.get(
  "/:reportId",
  authorize("lecturer", "admin", "leader"),
  ctrl.getReport,
);

export default router;
