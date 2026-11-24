import mongoose from "mongoose";

const perMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    submissions: { type: Number, default: 0 },
    contribution: { type: Number, default: 0 },
  },
  { _id: false },
);

const contributionReportSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    perMember: { type: [perMemberSchema], default: [] },
    summary: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      progress: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

contributionReportSchema.index({ group: 1, createdAt: -1 });

export default mongoose.model("ContributionReport", contributionReportSchema);
