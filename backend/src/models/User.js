import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: {
      type: String,
      enum: ["member", "lecturer", "leader"],
      default: "member",
    },
    view: {
      type: String,
      enum: ["member", "lecturer", "leader"],
      default: "member",
    },
    studentId: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    avatar: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    department: { type: String, default: "" },
    bio: { type: String, default: "" },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    project: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],

    // ── Two-factor ────────────────────────────────────────────────
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: "", select: false },
    twoFactorPendingSecret: { type: String, default: "", select: false },

    // ── Privacy preferences ───────────────────────────────────────
    privacy: {
      shareContribution: { type: Boolean, default: true },
      showActivity: { type: Boolean, default: true },
    },

    // ── Notification preferences ──────────────────────────────────
    // Keys match Notification.type values: task, submission, deadline, group
    notificationPreferences: {
      task: { type: Boolean, default: true },
      submission: { type: Boolean, default: true },
      deadline: { type: Boolean, default: true },
      group: { type: Boolean, default: true },
    },

    activity: [
      {
        action: { type: String, required: true },
        ip: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

export default mongoose.model("User", userSchema);
