import Assessment from "../models/Assesment.js";
import Answer from "../models/Answers.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

const MAX_ASSESSMENTS_PER_TASK = 5;

export default {
  // ── Create ─────────────────────────────────────────────────────────
  createAssessment: async (req, res, next) => {
    try {
      const {
        projectId,
        title,
        description = "",
        rubric = [],
        opensAt = null,
        closesAt = null,
        requireIndividualEvidence,
        lockEditsAfterSubmission,
        allowLeaderResubmission,
        latePolicy,
        markingScale,
        recipients = [],
        groups = [],
      } = req.body;

      const task = await Project.findById(projectId);
      if (!task) {
        res.status(404);
        throw new Error("Task not found");
      }

      const count = await Assessment.countDocuments({ task: projectId });
      if (count >= MAX_ASSESSMENTS_PER_TASK) {
        res.status(400);
        throw new Error(
          `A task can have at most ${MAX_ASSESSMENTS_PER_TASK} assessments.`,
        );
      }

      const assessment = await Assessment.create({
        task: projectId,
        title,
        description,
        createdBy: req.user._id,
        rubric,
        opensAt,
        closesAt,
        requireIndividualEvidence,
        lockEditsAfterSubmission,
        allowLeaderResubmission,
        latePolicy,
        markingScale,
        recipients,
        groups,
        status: opensAt ? "open" : "draft",
      });

      // Notify recipients (each student + leader)
      if (recipients.length > 0) {
        const notifications = recipients.map((userId) => ({
          user: userId,
          type: "task",
          title: `New assessment: ${title}`,
          message: `A new assessment "${title}" has been published for "${task.title}".`,
          link: `/assessments/${assessment._id}`,
          meta: {
            actor: req.user._id,
            group: null,
            project: projectId,
            leader: null,
            members: recipients,
          },
        }));
        await Notification.insertMany(notifications);
      }

      res.status(201).json(assessment);
    } catch (err) {
      next(err);
    }
  },

  // ── List (filter by task) ─────────────────────────────────────────
  listAssessments: async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.task) filter.task = req.query.task;
      if (req.query.status) filter.status = req.query.status;

      // Students see only assessments they're recipients of
      if (req.user.role !== "lecturer") {
        filter.recipients = req.user._id;
      }

      const assessments = await Assessment.find(filter)
        .populate("task", "title course projectId deadline")
        .populate("createdBy", "name email")
        .populate("recipients", "name email studentId")
        .populate("groups", "name")
        .sort("-createdAt");

      res.json(assessments);
    } catch (err) {
      next(err);
    }
  },

  // ── Get one ────────────────────────────────────────────────────────
  getAssessment: async (req, res, next) => {
    try {
      const assessment = await Assessment.findById(req.params.id)
        .populate("task", "title course projectId deadline")
        .populate("createdBy", "name email")
        .populate("recipients", "name email studentId")
        .populate("groups", "name");

      if (!assessment) {
        res.status(404);
        throw new Error("Assessment not found");
      }

      // Only recipients or the creator can read
      const isRecipient = assessment.recipients.some(
        (r) => String(r._id) === String(req.user._id),
      );
      const isCreator =
        String(assessment.createdBy._id) === String(req.user._id);

      if (!isRecipient && !isCreator && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Not authorized to view this assessment.");
      }

      res.json(assessment);
    } catch (err) {
      next(err);
    }
  },

  // ── Update ─────────────────────────────────────────────────────────
  updateAssessment: async (req, res, next) => {
    try {
      const assessment = await Assessment.findById(req.params.id);
      if (!assessment) {
        res.status(404);
        throw new Error("Assessment not found");
      }

      if (
        String(assessment.createdBy) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to update this assessment.");
      }

      const allowed = [
        "title",
        "description",
        "rubric",
        "opensAt",
        "closesAt",
        "requireIndividualEvidence",
        "lockEditsAfterSubmission",
        "allowLeaderResubmission",
        "latePolicy",
        "markingScale",
        "status",
        "recipients",
        "groups",
      ];
      for (const key of allowed) {
        if (req.body[key] !== undefined) assessment[key] = req.body[key];
      }

      const updated = await assessment.save();
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────
  deleteAssessment: async (req, res, next) => {
    try {
      const assessment = await Assessment.findById(req.params.id);
      if (!assessment) {
        res.status(404);
        throw new Error("Assessment not found");
      }

      if (
        String(assessment.createdBy) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to delete this assessment.");
      }

      // Cascade delete answers
      await Answer.deleteMany({ assessment: assessment._id });
      await assessment.deleteOne();

      res.json({ message: "Assessment and its answers deleted" });
    } catch (err) {
      next(err);
    }
  },

  // ══════════════════════════════════════════════════════════════════
  // ANSWERS
  // ══════════════════════════════════════════════════════════════════

  // ── Submit / create an answer ─────────────────────────────────────
  createAnswer: async (req, res, next) => {
    try {
      const { assessmentId } = req.params;
      const { body = "", evidence = [] } = req.body;

      const assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        res.status(404);
        throw new Error("Assessment not found");
      }

      if (
        String(assessment.createdBy) === String(req.user._id) ||
        req.user.role === "lecturer"
      ) {
        res.status(403);
        throw new Error("Lecturers cannot submit answers.");
      }

      const isRecipient = assessment.recipients.some(
        (r) => String(r) === String(req.user._id),
      );
      if (!isRecipient) {
        res.status(403);
        throw new Error("You are not a recipient of this assessment.");
      }

      const existing = await Answer.findOne({
        assessment: assessmentId,
        user: req.user._id,
      });
      if (existing) {
        res.status(409);
        throw new Error("You have already submitted an answer.");
      }

      // Late detection
      const now = new Date();
      const late = assessment.closesAt && now > new Date(assessment.closesAt);

      if (late && assessment.latePolicy === "block") {
        res.status(400);
        throw new Error("The deadline has passed and submissions are blocked.");
      }

      // Enforce evidence requirement
      if (
        assessment.requireIndividualEvidence &&
        (!evidence || evidence.length === 0)
      ) {
        res.status(400);
        throw new Error("This assessment requires at least one evidence file.");
      }

      const answer = await Answer.create({
        assessment: assessmentId,
        user: req.user._id,
        body,
        evidence,
        status: "submitted",
        submittedAt: now,
        late,
      });

      res.status(201).json(answer);
    } catch (err) {
      next(err);
    }
  },

  // ── List answers (filter by assessment) ───────────────────────────
  listAnswers: async (req, res, next) => {
    try {
      const { assessmentId } = req.params;
      const filter = { assessment: assessmentId };

      // Students can only see their own answer
      if (req.user.role !== "lecturer") {
        filter.user = req.user._id;
      }

      const answers = await Answer.find(filter)
        .populate("user", "name email studentId role")
        .populate("assessedBy", "name email")
        .sort("-createdAt");

      res.json(answers);
    } catch (err) {
      next(err);
    }
  },

  // ── Get one answer ────────────────────────────────────────────────
  getAnswer: async (req, res, next) => {
    try {
      const answer = await Answer.findById(req.params.answerId)
        .populate("user", "name email studentId role")
        .populate("assessedBy", "name email");

      if (!answer) {
        res.status(404);
        throw new Error("Answer not found");
      }

      const isOwn = String(answer.user._id) === String(req.user._id);
      if (!isOwn && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Not authorized to view this answer.");
      }

      res.json(answer);
    } catch (err) {
      next(err);
    }
  },

  // ── Update an answer (resubmit) ───────────────────────────────────
  updateAnswer: async (req, res, next) => {
    try {
      const answer = await Answer.findById(req.params.answerId);
      if (!answer) {
        res.status(404);
        throw new Error("Answer not found");
      }

      const assessment = await Assessment.findById(answer.assessment);

      const isOwn = String(answer.user) === String(req.user._id);
      const isLecturer = req.user.role === "lecturer";

      if (!isOwn && !isLecturer) {
        res.status(403);
        throw new Error("Not authorized to update this answer.");
      }

      // Students can only edit if resubmission is allowed
      if (isOwn && !isLecturer) {
        if (
          assessment.lockEditsAfterSubmission &&
          answer.status === "submitted"
        ) {
          const resubmitAllowed =
            assessment.allowLeaderResubmission && req.user.role === "leader";
          if (!resubmitAllowed) {
            res.status(400);
            throw new Error(
              "Edits are locked. Ask your lecturer to request changes.",
            );
          }
        }
      }

      const { body, evidence } = req.body;
      if (body !== undefined) answer.body = body;
      if (evidence !== undefined) answer.evidence = evidence;

      // If student is editing, bump back to submitted
      if (isOwn && !isLecturer) {
        answer.status = "submitted";
        answer.submittedAt = new Date();
        answer.assessedAt = null;
        answer.assessedBy = null;
        answer.totalScore = 0;
        answer.scores = [];
      }

      const updated = await answer.save();
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // ── Delete an answer ──────────────────────────────────────────────
  deleteAnswer: async (req, res, next) => {
    try {
      const answer = await Answer.findById(req.params.answerId);
      if (!answer) {
        res.status(404);
        throw new Error("Answer not found");
      }

      const isOwn = String(answer.user) === String(req.user._id);
      if (!isOwn && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Not authorized to delete this answer.");
      }

      // Students cannot delete once assessed
      if (isOwn && req.user.role !== "lecturer") {
        if (answer.status === "assessed") {
          res.status(400);
          throw new Error("Assessed answers cannot be deleted.");
        }
      }

      await answer.deleteOne();
      res.json({ message: "Answer deleted" });
    } catch (err) {
      next(err);
    }
  },

  // ── Assess an answer (lecturer) ───────────────────────────────────
  assessAnswer: async (req, res, next) => {
    try {
      if (req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Only lecturers can assess answers.");
      }

      const { scores = [], feedback = "", status = "assessed" } = req.body;
      const answer = await Answer.findById(req.params.answerId);
      if (!answer) {
        res.status(404);
        throw new Error("Answer not found");
      }

      if (!["assessed", "changes_requested"].includes(status)) {
        res.status(400);
        throw new Error("Invalid status for assessment.");
      }

      // Compute total score
      const total = scores.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
      answer.scores = scores;
      answer.totalScore = total;
      answer.feedback = feedback;
      answer.status = status;
      answer.assessedAt = new Date();
      answer.assessedBy = req.user._id;

      const updated = await answer.save();

      // Notify the student of the outcome
      await Notification.create({
        user: answer.user,
        type: "submission",
        title:
          status === "assessed" ? "Assessment published" : "Changes requested",
        message:
          status === "assessed"
            ? `Your submission has been assessed. Score: ${total}.`
            : `Your submission needs changes. Feedback: ${feedback || "See assessment."}`,
        link: `/assessments/${answer.assessment}`,
        meta: { actor: req.user._id, group: null, project: null },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
};
