import mongoose from "mongoose";

const rubricItemSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true, trim: true }, // e.g. "Research quality"
    weight: { type: Number, default: 1, min: 0 }, // relative weight
    maxScore: { type: Number, default: 100, min: 0 },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const assessmentSchema = new mongoose.Schema(
  {
    // Which task this assessment belongs to (max 5 per task, enforced in controller)
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },

    // Lecturer who created/owns the assessment
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Settings pulled from the Settings page ──────────────────────
    requireIndividualEvidence: { type: Boolean, default: true },
    lockEditsAfterSubmission: { type: Boolean, default: true },
    allowLeaderResubmission: { type: Boolean, default: true },
    latePolicy: {
      type: String,
      enum: ["flag", "block"],
      default: "flag",
    },
    markingScale: {
      type: String,
      enum: ["percentage", "letter"],
      default: "percentage",
    },

    // ── Assessment lifecycle ────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "open", "closed", "assessed"],
      default: "draft",
    },
    opensAt: { type: Date, default: null },
    closesAt: { type: Date, default: null }, // deadline

    // ── Rubric ──────────────────────────────────────────────────────
    rubric: { type: [rubricItemSchema], default: [] },

    // ── Audience ────────────────────────────────────────────────────
    // Users (students + leaders) who received this assessment.
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Convenience: which group(s) this assessment targets
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
  },
  { timestamps: true },
);

// One assessment can have max 5 per task — check in controller, but also
// index for fast lookups.
assessmentSchema.index({ task: 1, createdAt: -1 });

export default mongoose.model("Assessment", assessmentSchema);
