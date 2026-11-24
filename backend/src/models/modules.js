import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    credits: { type: Number, default: 0, min: 0 },
    semester: {
      type: String,
      enum: ["1", "2", "summer", "other"],
      default: "1",
    },

    // The lecturer(s) who own the module. A module may have one or more.
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Students enrolled on the module.
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Groups belonging to this module.
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

moduleSchema.index({ lecturer: 1, isActive: 1 });

export default mongoose.model("Module", moduleSchema);
