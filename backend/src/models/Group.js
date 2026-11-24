import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["todo", "in-review", "in-progress", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    leader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    groupMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: { type: Number },
    code: { type: String },
    initials: { type: String },
    numberOfGroups: { type: Number },
    groupLabelType: { type: String, enum: ["alpha", "numeric"] },
    singleGroup: { type: Boolean },
    leaderSelection: { type: String, enum: ["random", "manual"] },
    memberSelection: { type: String, enum: ["random", "manual"] },
    task: { type: String },
    due: { type: String },
    flagged: { type: Boolean, default: false },
    ready: { type: Boolean, default: false },
    active: { type: Boolean, default: true },

    // Leader-created subtasks live here.
    subtasks: [subtaskSchema],
  },
  { timestamps: true },
);

groupSchema.index({ project: 1, active: 1 });
groupSchema.index({ leader: 1 });
groupSchema.index({ groupMembers: 1 });

export default mongoose.model("Group", groupSchema);
