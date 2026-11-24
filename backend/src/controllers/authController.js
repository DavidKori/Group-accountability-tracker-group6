import {
  registerUser,
  loginUser,
  changePassword as changePasswordService,
  startTwoFactor,
  verifyTwoFactor,
  verifyTwoFactorLogin,
  verifyLiveTwoFactor,
  disableTwoFactor,
  sanitize,
} from "../services/authService.js";
import User from "../models/User.js";

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400);
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body, req);
    res.json(result);
  } catch (err) {
    res.status(401);
    next(err);
  }
};

export const me = async (req, res) => {
  res.json(sanitize(req.user));
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, studentId, avatar, department, bio } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, studentId, avatar, department, bio },
      { new: true, runValidators: true },
    ).select("-password");
    res.json(sanitize(user));
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await changePasswordService(
      req.user._id,
      { currentPassword, newPassword },
      req,
    );
    res.json(result);
  } catch (err) {
    res.status(400);
    next(err);
  }
};

// ── 2FA endpoints ─────────────────────────────────────────────────
export const start2FA = async (req, res, next) => {
  try {
    const result = await startTwoFactor(req.user._id);
    res.json(result);
  } catch (err) {
    res.status(400);
    next(err);
  }
};

export const verify2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    // console.log("code", code);
    if (!code) {
      res.status(400);
      throw new Error("Verification code is required");
    }
    const result = await verifyTwoFactor(req.user._id, code, req);
    res.json(result);
  } catch (err) {
    res.status(400);
    next(err);
  }
};

export const disable2FA = async (req, res, next) => {
  try {
    const result = await disableTwoFactor(req.user._id, req);
    res.json(result);
  } catch (err) {
    res.status(400);
    next(err);
  }
};

// Called from the frontend during login when requiresTwoFactor is true
export const verifyLogin2FA = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      res.status(400);
      throw new Error("tempToken and code are required");
    }
    const result = await verifyTwoFactorLogin(tempToken, code, req);
    res.json(result);
  } catch (err) {
    res.status(401);
    next(err);
  }
};

// Called from TwoFactorGate when the user already has a token but
// needs to re-verify because 2FA was enabled mid-session
export const verifyLive2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400);
      throw new Error("Verification code is required");
    }
    const result = await verifyLiveTwoFactor(req.user._id, code, req);
    res.json(result);
  } catch (err) {
    res.status(401);
    next(err);
  }
};
