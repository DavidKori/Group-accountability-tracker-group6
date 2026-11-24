import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // The actual content the student submits
    body: { type: String, trim: true, default: "" },

    // Evidence files (URLs or storage keys) — matches requireIndividualEvidence
    evidence: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, default: 0 },
      },
    ],

    // ── Per-rubric scoring ─────────────────────────────────────────
    scores: [
      {
        criterion: { type: String, trim: true },
        score: { type: Number, default: 0 },
        comment: { type: String, trim: true, default: "" },
      },
    ],

    totalScore: { type: Number, default: 0 },

    // ── State ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "submitted", "assessed", "changes_requested"],
      default: "draft",
    },
    submittedAt: { type: Date, default: null },
    assessedAt: { type: Date, default: null },
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    feedback: { type: String, trim: true, default: "" },
    late: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One answer per user per assessment
answerSchema.index({ assessment: 1, user: 1 }, { unique: true });

export default mongoose.model("Answer", answerSchema);
