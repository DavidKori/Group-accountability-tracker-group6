import Module from "../models/modules.js";
import User from "../models/User.js";
import Group from "../models/Group.js";

export default {
  // ── Create ─────────────────────────────────────────────────────────
  createModule: async (req, res, next) => {
    try {
      const {
        code,
        name,
        description = "",
        credits = 0,
        semester = "1",
        students = [],
      } = req.body;

      if (!code || !name) {
        res.status(400);
        throw new Error("Module code and name are required.");
      }

      const existing = await Module.findOne({ code: code.toUpperCase() });
      if (existing) {
        res.status(409);
        throw new Error(`Module ${code.toUpperCase()} already exists.`);
      }

      const module = await Module.create({
        code,
        name,
        description,
        credits,
        semester,
        lecturer: req.user._id,
        students,
      });

      res.status(201).json(module);
    } catch (err) {
      next(err);
    }
  },

  // ── List ───────────────────────────────────────────────────────────
  listModules: async (req, res, next) => {
    try {
      const filter = {};

      // Lecturers see their own modules; students see modules they're enrolled on.
      if (req.user.role === "lecturer") {
        filter.lecturer = req.user._id;
      } else {
        filter.students = req.user._id;
      }

      if (req.query.active !== undefined) {
        filter.isActive = req.query.active === "true";
      }
      if (req.query.semester) {
        filter.semester = req.query.semester;
      }

      const modules = await Module.find(filter)
        .populate("lecturer", "name email")
        .populate("students", "name email studentId")
        .populate("groups", "name")
        .sort("-createdAt");

      res.json(modules);
    } catch (err) {
      next(err);
    }
  },

  // ── Get one ────────────────────────────────────────────────────────
  getModule: async (req, res, next) => {
    try {
      const module = await Module.findById(req.params.id)
        .populate("lecturer", "name email")
        .populate("students", "name email studentId")
        .populate("groups", "name leader groupMembers");

      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      // Only the owning lecturer or an enrolled student may read it.
      const isOwner = String(module.lecturer._id) === String(req.user._id);
      const isEnrolled = module.students.some(
        (s) => String(s._id) === String(req.user._id),
      );

      if (!isOwner && !isEnrolled && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Not authorized to view this module.");
      }

      res.json(module);
    } catch (err) {
      next(err);
    }
  },

  // ── Update ─────────────────────────────────────────────────────────
  updateModule: async (req, res, next) => {
    try {
      const module = await Module.findById(req.params.id);
      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      if (
        String(module.lecturer) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to update this module.");
      }

      const allowed = [
        "name",
        "description",
        "credits",
        "semester",
        "isActive",
      ];
      for (const key of allowed) {
        if (req.body[key] !== undefined) module[key] = req.body[key];
      }

      // Code changes need uniqueness checking.
      if (req.body.code !== undefined) {
        const newCode = req.body.code.toUpperCase();
        if (newCode !== module.code) {
          const clash = await Module.findOne({ code: newCode });
          if (clash) {
            res.status(409);
            throw new Error(`Module ${newCode} already exists.`);
          }
          module.code = newCode;
        }
      }

      const updated = await module.save();
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // ── Delete ─────────────────────────────────────────────────────────
  deleteModule: async (req, res, next) => {
    try {
      const module = await Module.findById(req.params.id);
      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      if (
        String(module.lecturer) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to delete this module.");
      }

      // Detach any groups that pointed at this module.
      await Group.updateMany(
        { _id: { $in: module.groups } },
        { $unset: { module: 1 } },
      );

      await module.deleteOne();
      res.json({ message: "Module deleted" });
    } catch (err) {
      next(err);
    }
  },

  // ── Enrol students ─────────────────────────────────────────────────
  enrollStudents: async (req, res, next) => {
    try {
      const { studentIds = [] } = req.body;
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        res.status(400);
        throw new Error("studentIds array is required.");
      }

      const module = await Module.findById(req.params.id);
      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      if (
        String(module.lecturer) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to modify this module.");
      }

      // Only real users with a student-ish role get enrolled.
      const validUsers = await User.find({
        _id: { $in: studentIds },
        role: { $in: ["member", "leader"] },
      }).select("_id");

      const validIds = validUsers.map((u) => String(u._id));

      module.students = [
        ...new Set([...module.students.map(String), ...validIds]),
      ];

      await module.save();
      res.json(module);
    } catch (err) {
      next(err);
    }
  },

  // ── Unenrol a student ──────────────────────────────────────────────
  removeStudent: async (req, res, next) => {
    try {
      const module = await Module.findById(req.params.id);
      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      if (
        String(module.lecturer) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to modify this module.");
      }

      module.students = module.students.filter(
        (s) => String(s) !== String(req.params.studentId),
      );

      await module.save();
      res.json(module);
    } catch (err) {
      next(err);
    }
  },

  // ── Attach / detach a group ────────────────────────────────────────
  addGroup: async (req, res, next) => {
    try {
      const { groupId } = req.body;
      const module = await Module.findById(req.params.id);
      const group = await Group.findById(groupId);

      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }

      if (
        String(module.lecturer) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to modify this module.");
      }

      if (!module.groups.some((g) => String(g) === String(groupId))) {
        module.groups.push(groupId);
        await module.save();
      }

      group.module = module._id;
      await group.save();

      res.json(module);
    } catch (err) {
      next(err);
    }
  },

  removeGroup: async (req, res, next) => {
    try {
      const module = await Module.findById(req.params.id);
      if (!module) {
        res.status(404);
        throw new Error("Module not found");
      }

      if (
        String(module.lecturer) !== String(req.user._id) &&
        req.user.role !== "lecturer"
      ) {
        res.status(403);
        throw new Error("Not authorized to modify this module.");
      }

      module.groups = module.groups.filter(
        (g) => String(g) !== String(req.params.groupId),
      );
      await module.save();

      await Group.findByIdAndUpdate(req.params.groupId, {
        $unset: { module: 1 },
      });

      res.json(module);
    } catch (err) {
      next(err);
    }
  },
};
