import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import notificationService from "../services/notificationService.js";

export default {
  addComment: async (req, res, next) => {
    try {
      const { task: taskId, text } = req.body;
      const task = await Task.findById(taskId);
      if (!task) {
        res.status(404);
        throw new Error("Task not found");
      }
      const comment = await Comment.create({
        task: taskId,
        author: req.user._id,
        text,
      });
      const notifyTargets = [task.assignedTo, task.createdBy].filter(
        (id) => id && String(id) !== String(req.user._id),
      );
      await notificationService.notifyMany(notifyTargets, {
        message: `New comment on task: ${task.title}`,
        link: `/tasks/${task._id}`,
        type: "comment",
      });
      const populated = await comment.populate("author", "name email");
      res.status(201).json(populated);
    } catch (err) {
      next(err);
    }
  },
  listComments: async (req, res, next) => {
    try {
      const comments = await Comment.find({ task: req.params.taskId })
        .populate("author", "name email")
        .sort("createdAt");
      res.json(comments);
    } catch (err) {
      next(err);
    }
  },
  deleteComment: async (req, res, next) => {
    try {
      const comment = await Comment.findById(req.params.id);
      if (!comment) {
        res.status(404);
        throw new Error("Comment not found");
      }
      const isOwner = String(comment.author) === String(req.user._id);
      const isPrivileged = ["lecturer", "admin"].includes(req.user.role);
      if (!isOwner && !isPrivileged) {
        res.status(403);
        throw new Error("Not allowed");
      }
      await comment.deleteOne();
      res.json({ message: "Comment deleted" });
    } catch (err) {
      next(err);
    }
  },
};
