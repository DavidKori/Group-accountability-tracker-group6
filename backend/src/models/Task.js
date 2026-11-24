import mongoose from "mongoose";

const generateTaskId = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let taskId = "";
  for (let i = 0; i < 6; i++) {
    taskId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return taskId;
};

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    taskId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
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

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    course: { type: String },
    groups: { type: String },
    rubric: { type: String },

    requireIndividualEvidence: { type: Boolean, default: true },
    active: { type: Boolean, default: true },

    deadline: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

taskSchema.pre("validate", function () {
  if (this.isNew && !this.taskId) {
    this.taskId = generateTaskId();
  }
});

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });

export default mongoose.model("Task", taskSchema);
