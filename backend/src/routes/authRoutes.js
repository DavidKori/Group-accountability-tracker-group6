import express from "express";
const router = express.Router();
import {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  start2FA,
  verify2FA,
  disable2FA,
  verifyLogin2FA,
  verifyLive2FA,
} from "../controllers/authController.js";
import protect from "../middlewares/authMiddleware.js";

// Public
router.post("/register", register);
router.post("/login", login);
router.post("/2fa/verify-login", verifyLogin2FA); // uses tempToken, no protect

// Authenticated
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/2fa/start", protect, start2FA);
router.post("/2fa/verify", protect, verify2FA);
router.post("/2fa/disable", protect, disable2FA);
router.post("/2fa/verify-live", protect, verifyLive2FA);

export default router;
