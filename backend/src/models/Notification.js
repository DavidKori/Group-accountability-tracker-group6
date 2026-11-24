import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "task",
        "submission",
        "comment",
        "deadline",
        "invite",
        "general",
        "group", // ← new: group membership notifications
      ],
      default: "general",
    },
    title: { type: String, default: "" },
    message: { type: String, required: true },
    link: { type: String, default: "" },

    // Optional context so the UI can group / filter notifications
    // without parsing the message string.
    meta: {
      group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
      project: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who triggered it
      members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ "meta.group": 1 });

notificationSchema.methods.markRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

export default mongoose.model("Notification", notificationSchema);
