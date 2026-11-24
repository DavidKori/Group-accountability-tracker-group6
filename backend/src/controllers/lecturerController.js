import Project from "../models/Project.js";
import Group from "../models/Group.js";
import Task from "../models/Task.js";
import Submission from "../models/Submission.js";

export default {
  overview: async (req, res, next) => {
    try {
      const projects = await Project.find({ lecturer: req.user._id });
      const projectIds = projects.map((p) => p._id);
      const groups = await Group.find({ project: { $in: projectIds } });
      const groupIds = groups.map((g) => g._id);
      const tasks = await Task.find({ group: { $in: groupIds } });
      const taskIds = tasks.map((t) => t._id);
      const pendingSubmissions = await Submission.countDocuments({
        task: { $in: taskIds },
        status: "pending",
      });

      res.json({
        totalProjects: projects.length,
        totalGroups: groups.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "done").length,
        pendingSubmissions,
      });
    } catch (err) {
      next(err);
    }
  },
  pendingSubmissions: async (req, res, next) => {
    try {
      const projects = await Project.find({ lecturer: req.user._id });
      const projectIds = projects.map((p) => p._id);
      const groups = await Group.find({ project: { $in: projectIds } });
      const groupIds = groups.map((g) => g._id);
      const tasks = await Task.find({ group: { $in: groupIds } });
      const taskIds = tasks.map((t) => t._id);
      const subs = await Submission.find({
        task: { $in: taskIds },
        status: "pending",
      })
        .populate("student", "name email")
        .populate("task", "title")
        .sort("-createdAt");
      res.json(subs);
    } catch (err) {
      next(err);
    }
  },
};
