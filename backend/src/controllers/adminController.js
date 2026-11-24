import User from "../models/User.js";
import Project from "../models/Project.js";
import Group from "../models/Group.js";
import Task from "../models/Task.js";

export default {
  stats: async (req, res, next) => {
    try {
      const [users, projects, groups, tasks] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments(),
        Group.countDocuments(),
        Task.countDocuments(),
      ]);
      res.json({ users, projects, groups, tasks });
    } catch (err) {
      next(err);
    }
  },
  listAllUsers: async (req, res, next) => {
    try {
      const users = await User.find().select("-password").sort("-createdAt");
      res.json(users);
    } catch (err) {
      next(err);
    }
  },
  toggleUserActive: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
      user.isActive = !user.isActive;
      await user.save();
      res.json({ _id: user._id, isActive: user.isActive });
    } catch (err) {
      next(err);
    }
  },
};
