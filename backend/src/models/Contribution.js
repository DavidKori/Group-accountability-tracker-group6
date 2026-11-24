import mongoose from "mongoose";

const contributionReportSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    perMember: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        totalTasks: { type: Number, default: 0 },
        completedTasks: { type: Number, default: 0 },
        submissions: { type: Number, default: 0 },
        contribution: { type: Number, default: 0 },
      },
    ],
    summary: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export default mongoose.model("ContributionReport", contributionReportSchema);
