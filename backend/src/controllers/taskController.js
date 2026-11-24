import Project from "../models/Project.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";

export default {
  // ── Create ────────────────────────────────────────────────────────
  createTask: async (req, res, next) => {
    try {
      if (req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Only lecturers can create projects");
      }

      const { title, description, course, deadline } = req.body;
      if (!title) {
        res.status(400);
        throw new Error("Project title is required");
      }

      const project = await Project.create({
        title,
        description: description ?? "",
        course: course ?? "",
        deadline: deadline ? new Date(deadline) : null,
        lecturer: req.user._id,
        status: "active",
      });

      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  },

  // ── List ──────────────────────────────────────────────────────────
  listTasks: async (req, res, next) => {
    try {
      const filter = {};

      if (req.user.role === "lecturer") {
        filter.lecturer = req.user._id;
      } else {
        // leader/member: only projects they touch via a group
        const memberships = await GroupMember.find({
          user: req.user._id,
        }).populate({ path: "group", select: "project active" });

        const projectIds = [
          ...new Set(
            memberships
              .filter((m) => m.group?.active !== false)
              .map((m) => String(m.group.project))
              .filter(Boolean),
          ),
        ];
        filter._id = { $in: projectIds };
      }

      if (req.query.status) filter.status = req.query.status;

      const projects = await Project.find(filter)
        .populate("lecturer", "name email")
        .sort("-createdAt");

      // Annotate with group counts so the UI can show "3 groups"
      const projectIds = projects.map((p) => p._id);
      const groupCounts = await Group.aggregate([
        { $match: { project: { $in: projectIds }, active: true } },
        { $group: { _id: "$project", count: { $sum: 1 } } },
      ]);
      const countByProject = Object.fromEntries(
        groupCounts.map((g) => [String(g._id), g.count]),
      );

      const enriched = projects.map((p) => ({
        ...p.toObject(),
        groupCount: countByProject[String(p._id)] ?? 0,
      }));

      res.json(enriched);
    } catch (err) {
      next(err);
    }
  },

  // ── Get one ───────────────────────────────────────────────────────
  getTask: async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id).populate(
        "lecturer",
        "name email",
      );
      if (!project) {
        res.status(404);
        throw new Error("Project not found");
      }

      const groups = await Group.find({
        project: project._id,
        active: true,
      })
        .populate("leader", "name email studentId")
        .populate("groupMembers", "name email studentId role")
        .sort("-createdAt");

      // If the caller is a member/leader, only show their own group(s)
      let visibleGroups = groups;
      if (req.user.role !== "lecturer") {
        const myMemberships = await GroupMember.find({
          user: req.user._id,
          group: { $in: groups.map((g) => g._id) },
        });
        const allowedGroupIds = myMemberships.map((m) => String(m.group));
        visibleGroups = groups.filter((g) =>
          allowedGroupIds.includes(String(g._id)),
        );
      }

      res.json({ project, groups: visibleGroups });
    } catch (err) {
      next(err);
    }
  },

  // ── Update ────────────────────────────────────────────────────────
  updateTask: async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        res.status(404);
        throw new Error("Project not found");
      }
      if (String(project.lecturer) !== String(req.user._id)) {
        res.status(403);
        throw new Error("Not authorized to update this project");
      }

      const allowed = ["title", "description", "course", "deadline", "status"];
      const updates = {};
      for (const k of allowed) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }

      const updated = await Project.findByIdAndUpdate(project._id, updates, {
        new: true,
        runValidators: true,
      }).populate("lecturer", "name email");

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // ── Delete (hard delete + cascade) ────────────────────────────────
  deleteTask: async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        res.status(404);
        throw new Error("Project not found");
      }
      if (String(project.lecturer) !== String(req.user._id)) {
        res.status(403);
        throw new Error("Not authorized to delete this project");
      }

      const groups = await Group.find({ project: project._id }).select("_id");
      const groupIds = groups.map((g) => g._id);

      await GroupMember.deleteMany({ group: { $in: groupIds } });
      await Group.deleteMany({ project: project._id });
      await User.updateMany(
        { project: project._id },
        { $pull: { project: project._id } },
      );
      await project.deleteOne();

      res.json({
        message: "Project and associated groups deleted",
        deletedGroups: groupIds.length,
      });
    } catch (err) {
      next(err);
    }
  },
};
