import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const MAX_ACTIVITY_ENTRIES = 50;
const TEMP_2FA_TTL = "15m";

// ── Sanitizer (unchanged) ──────────────────────────────────────────
export const sanitize = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  view: user.view,
  studentId: user.studentId,
  avatar: user.avatar,
  department: user.department ?? "",
  bio: user.bio ?? "",
  isActive: user.isActive ?? true,
  twoFactorEnabled: user.twoFactorEnabled ?? false,
  privacy: user.privacy ?? {
    shareContribution: true,
    showActivity: true,
  },
  notificationPreferences: user.notificationPreferences ?? {
    task: true,
    submission: true,
    deadline: true,
    group: true,
  },
  status: true,
});

// ── Activity log helper ───────────────────────────────────────────
const logActivity = async (userId, action, req) => {
  const entry = {
    action,
    ip: req?.ip ?? req?.headers?.["x-forwarded-for"] ?? "",
    userAgent: req?.headers?.["user-agent"] ?? "",
    at: new Date(),
  };
  await User.updateOne(
    { _id: userId },
    {
      $push: {
        activity: { $each: [entry], $slice: -MAX_ACTIVITY_ENTRIES },
      },
    },
  );
};

const signTempToken = (userId) =>
  jwt.sign(
    { id: String(userId), stage: "2fa-pending" },
    process.env.JWT_SECRET,
    { expiresIn: TEMP_2FA_TTL },
  );

// ── Register ──────────────────────────────────────────────────────
export const registerUser = async ({
  name,
  email,
  password,
  role,
  studentId,
}) => {
  const exists = await User.findOne({ email });
  const exists1 = await User.findOne({ studentId });
  if (exists || exists1) throw new Error("user already registered");
  const user = await User.create({
    name,
    email,
    password,
    role,
    studentId,
  });
  return { ...sanitize(user), token: generateToken(user._id) };
};

// ── Login ─────────────────────────────────────────────────────────
// Returns one of:
//   { ...sanitize(user), token }                         (2FA off)
//   { requiresTwoFactor: true, tempToken, user: {_id, role, name, email} }  (2FA on)
export const loginUser = async ({ studentId, email, password }, req = null) => {
  const user = email
    ? await User.findOne({ email }).select("+password")
    : await User.findOne({ studentId }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new Error("Invalid credentials");
  }
  if (!user.isActive) throw new Error("Account is deactivated");

  if (user.twoFactorEnabled) {
    return {
      requiresTwoFactor: true,
      tempToken: signTempToken(user._id),
      // Minimal user info so the frontend can store something while waiting
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  await logActivity(user._id, "login", req);
  return { ...sanitize(user), token: generateToken(user._id) };
};

// ── Verify 2FA during login (temp token path) ──────────────────────
export const verifyTwoFactorLogin = async (tempToken, code, req = null) => {
  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch {
    throw new Error("Session expired. Sign in again.");
  }
  if (payload.stage !== "2fa-pending") {
    throw new Error("Invalid session");
  }

  const user = await User.findById(payload.id).select("+twoFactorSecret");
  if (!user) throw new Error("User not found");
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("Two-factor is not enabled on this account");
  }

  const ok = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: String(code).padStart(6, "0"),
    window: 10,
  });
  if (!ok) throw new Error("Invalid verification code");

  await logActivity(user._id, "login_2fa", req);
  return { ...sanitize(user), token: generateToken(user._id) };
};

// ── Verify 2FA for an already-authenticated session (live path) ────
// Used by TwoFactorGate when 2FA was enabled after the current session
// was created.
export const verifyLiveTwoFactor = async (userId, code, req = null) => {
  const user = await User.findById(userId).select("+twoFactorSecret");
  if (!user) throw new Error("User not found");
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error("Two-factor is not enabled on this account");
  }
  const ok = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: String(code).padStart(6, "0"),
    window: 10,
  });
  if (!ok) throw new Error("Invalid verification code");
  await logActivity(user._id, "login_2fa_live", req);
  return { verified: true };
};

// ── Change password ───────────────────────────────────────────────
export const changePassword = async (
  userId,
  { currentPassword, newPassword },
  req = null,
) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new Error("User not found");
  if (!(await user.matchPassword(currentPassword))) {
    throw new Error("Current password is incorrect");
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }
  user.password = newPassword;
  user.activity.push({
    action: "password_change",
    ip: req?.ip ?? "",
    userAgent: req?.headers?.["user-agent"] ?? "",
    at: new Date(),
  });
  if (user.activity.length > MAX_ACTIVITY_ENTRIES) {
    user.activity = user.activity.slice(-MAX_ACTIVITY_ENTRIES);
  }
  await user.save();
  return { message: "Password updated" };
};

// ── 2FA setup ─────────────────────────────────────────────────────
export const startTwoFactor = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Only block if it's fully enabled (enabled + has secret)
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    throw new Error("Two-factor is already enabled");
  }

  // If enabled flag is true but secret is missing, clean it up first
  if (user.twoFactorEnabled && !user.twoFactorSecret) {
    await User.updateOne(
      { _id: userId },
      { $set: { twoFactorEnabled: false } },
    );
  }

  const secret = speakeasy.generateSecret({
    name: `Contribu (${user.email})`,
    length: 20,
  });

  await User.updateOne(
    { _id: userId },
    { $set: { twoFactorPendingSecret: secret.base32 } },
  );

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  return {
    secret: secret.base32,
    qrCodeDataUrl,
    otpauthUrl: secret.otpauth_url,
  };
};
// export const startTwoFactor = async (userId) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");
//   if (user.twoFactorEnabled) {
//     throw new Error("Two-factor is already enabled");
//   }

//   const secret = speakeasy.generateSecret({
//     name: `Contribu (${user.email})`,
//     length: 20,
//   });

//   await User.updateOne(
//     { _id: userId },
//     { $set: { twoFactorPendingSecret: secret.base32 } },
//   );

//   const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);
//   return {
//     secret: secret.base32,
//     qrCodeDataUrl,
//     otpauthUrl: secret.otpauth_url,
//   };
// };

export const verifyTwoFactor = async (userId, code, req = null) => {
  const user = await User.findById(userId).select("+twoFactorPendingSecret");
  if (!user) throw new Error("User not found");
  if (user.twoFactorEnabled) throw new Error("Two-factor is already enabled");
  if (!user.twoFactorPendingSecret) {
    throw new Error("No pending setup. Start the setup first.");
  }

  const ok = speakeasy.totp.verify({
    secret: user.twoFactorPendingSecret,
    encoding: "base32",
    token: String(code).padStart(6, "0"),
    window: 10,
  });
  console.log("ok:", ok);
  console.log("code:", code);
  console.log("secret:", user.twoFactorPendingSecret);
  if (!ok) throw new Error("Invalid verification code");
  user.twoFactorEnabled = true;
  user.twoFactorSecret = user.twoFactorPendingSecret;
  user.twoFactorPendingSecret = "";
  user.activity.push({
    action: "2fa_enabled",
    ip: req?.ip ?? "",
    userAgent: req?.headers?.["user-agent"] ?? "",
    at: new Date(),
  });
  if (user.activity.length > MAX_ACTIVITY_ENTRIES) {
    user.activity = user.activity.slice(-MAX_ACTIVITY_ENTRIES);
  }
  await user.save();

  return { enabled: true };
};

export const disableTwoFactor = async (userId, req = null) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (!user.twoFactorEnabled) {
    throw new Error("Two-factor is not enabled");
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = "";
  user.twoFactorPendingSecret = "";
  user.activity.push({
    action: "2fa_disabled",
    ip: req?.ip ?? "",
    userAgent: req?.headers?.["user-agent"] ?? "",
    at: new Date(),
  });
  if (user.activity.length > MAX_ACTIVITY_ENTRIES) {
    user.activity = user.activity.slice(-MAX_ACTIVITY_ENTRIES);
  }
  await user.save();

  return { enabled: false };
};
