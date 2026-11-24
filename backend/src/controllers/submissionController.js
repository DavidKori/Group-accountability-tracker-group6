import Submission from "../models/Submission.js";
import Task from "../models/Task.js";
import notificationService from "../services/notificationService.js";

export default {
  createSubmission: async (req, res, next) => {
    try {
      const { task: taskId, content, fileUrl, filePublicId } = req.body;
      const task = await Task.findById(taskId);
      if (!task) {
        res.status(404);
        throw new Error("Task not found");
      }
      const submission = await Submission.create({
        task: taskId,
        student: req.user._id,
        content,
        fileUrl,
        filePublicId,
      });
      if (task.createdBy) {
        await notificationService.notify({
          user: task.createdBy,
          message: `New submission for task: ${task.title}`,
          link: `/tasks/${task._id}`,
          type: "submission",
        });
      }
      res.status(201).json(submission);
    } catch (err) {
      next(err);
    }
  },
  listSubmissions: async (req, res, next) => {
    try {
      const filter = {};
      if (req.query.task) filter.task = req.query.task;
      if (req.query.status) filter.status = req.query.status;
      if (req.user.role === "student") filter.student = req.user._id;
      const subs = await Submission.find(filter)
        .populate("student", "name email")
        .populate("task", "title")
        .sort("-createdAt");
      res.json(subs);
    } catch (err) {
      next(err);
    }
  },
  getSubmission: async (req, res, next) => {
    try {
      const sub = await Submission.findById(req.params.id)
        .populate("student", "name email")
        .populate("task", "title group");
      if (!sub) {
        res.status(404);
        throw new Error("Submission not found");
      }
      res.json(sub);
    } catch (err) {
      next(err);
    }
  },
  reviewSubmission: async (req, res, next) => {
    try {
      const { status, feedback } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        res.status(400);
        throw new Error("Status must be approved or rejected");
      }
      const submission = await Submission.findByIdAndUpdate(
        req.params.id,
        {
          status,
          feedback,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
        { new: true },
      );
      if (!submission) {
        res.status(404);
        throw new Error("Submission not found");
      }
      await notificationService.notify({
        user: submission.student,
        message: `Your submission was ${status}`,
        link: `/submissions/${submission._id}`,
        type: "submission",
      });
      res.json(submission);
    } catch (err) {
      next(err);
    }
  },
};
