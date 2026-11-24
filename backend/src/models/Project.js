import mongoose from "mongoose";
const generateTaskId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let taskId = "";
  for (let i = 0; i < 6; i++) {
    taskId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return taskId;
};
const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    course: { type: String, default: "" },
    deadline: { type: Date },
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["todo", "in-progress", "done"],
      default: "todo",
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // nullable, but unique when present
      uppercase: true,
      trim: true,
    },
    project: { type: String },
    assignedTo: { type: String },
    projectId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    taskId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    numberOfGroups: { type: String },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],

    requireIndividualEvidence: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    completedAt: { type: Date },
    rubric: { type: String },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  { timestamps: true },
);
projectSchema.pre("validate", function () {
  if (this.isNew && !this.projectId) {
    this.projectId = generateTaskId();
  }
  if (this.isNew && !this.taskId) {
    this.taskId = generateTaskId();
  }
});

projectSchema.index({ assignedTo: 1, status: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ lecturer: 1, status: 1 });

export default mongoose.model("Project", projectSchema);
