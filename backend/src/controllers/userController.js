import User from "../models/User.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import { getPagination, paginatedResponse } from "../utils/pagination.js";

export default {
  listUsers: async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const filter = {};
      if (req.query.role) filter.role = req.query.role;
      if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === "true";
      }
      if (req.query.q) {
        filter.$or = [
          { name: { $regex: req.query.q, $options: "i" } },
          { email: { $regex: req.query.q, $options: "i" } },
          { studentId: { $regex: req.query.q, $options: "i" } },
        ];
      }
      const [users, total] = await Promise.all([
        User.find(filter)
          .select(
            "-password -activity -twoFactorSecret -twoFactorPendingSecret",
          )
          .skip(skip)
          .limit(limit)
          .sort("-createdAt"),
        User.countDocuments(filter),
      ]);
      res.json(paginatedResponse(users, total, page, limit));
    } catch (err) {
      next(err);
    }
  },

  getUser: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id).select(
        "-password -activity -twoFactorSecret -twoFactorPendingSecret",
      );
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  updateUser: async (req, res, next) => {
    try {
      const isSelf = String(req.user._id) === String(req.params.id);
      const isPrivileged =
        req.user.role === "lecturer" || req.user.role === "admin";

      if (!isSelf && !isPrivileged) {
        res.status(403);
        throw new Error("Not authorized to update this user.");
      }

      const {
        name,
        studentId,
        role,
        isActive,
        department,
        bio,
        privacy,
        notificationPreferences,
      } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (studentId !== undefined) updates.studentId = studentId;
      if (department !== undefined) updates.department = department;
      if (bio !== undefined) updates.bio = bio;

      // Privacy: only replace the keys the client sent
      if (privacy && typeof privacy === "object") {
        if (privacy.shareContribution !== undefined) {
          updates["privacy.shareContribution"] = Boolean(
            privacy.shareContribution,
          );
        }
        if (privacy.showActivity !== undefined) {
          updates["privacy.showActivity"] = Boolean(privacy.showActivity);
        }
      }

      // Notification preferences
      if (
        notificationPreferences &&
        typeof notificationPreferences === "object"
      ) {
        for (const key of ["task", "submission", "deadline", "group"]) {
          if (notificationPreferences[key] !== undefined) {
            updates[`notificationPreferences.${key}`] = Boolean(
              notificationPreferences[key],
            );
          }
        }
      }

      // twoFactorEnabled is intentionally ignored here — it's only set
      // via /auth/2fa/* endpoints to keep the state machine strict.

      if (isPrivileged && !isSelf) {
        if (role) updates.role = role;
        if (typeof isActive === "boolean") updates.isActive = isActive;
      }

      const user = await User.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      }).select("-password -activity -twoFactorSecret -twoFactorPendingSecret");

      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
      res.json(user);
    } catch (err) {
      next(err);
    }
  },

  deleteUser: async (req, res, next) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
      await GroupMember.deleteMany({ user: user._id });
      await Group.updateMany(
        { groupMembers: user._id },
        { $pull: { groupMembers: user._id } },
      );
      await Group.updateMany({ leader: user._id }, { $set: { leader: null } });
      res.json({ message: "User deleted" });
    } catch (err) {
      next(err);
    }
  },

  getActivity: async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select("activity");
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }
      const recent = [...(user.activity ?? [])]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 20);
      res.json(recent);
    } catch (err) {
      next(err);
    }
  },

  // ── Data export ─────────────────────────────────────────────────
  exportData: async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select(
        "-password -twoFactorSecret -twoFactorPendingSecret",
      );
      if (!user) {
        res.status(404);
        throw new Error("User not found");
      }

      const memberships = await GroupMember.find({ user: user._id })
        .populate("group", "name code project")
        .populate({
          path: "group",
          populate: { path: "project", select: "title course" },
        });

      const projects = await Project.find({
        _id: { $in: user.project ?? [] },
      }).select("title course deadline status");

      const memberGroupIds = (
        await GroupMember.find({ user: user._id }).select("group")
      ).map((m) => m.group);

      const tasks = await Task.find({
        assignedTo: { $in: memberGroupIds },
      })
        .populate("assignedTo", "name")
        .select("title description status priority deadline completedAt");

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: user.studentId,
          department: user.department,
          bio: user.bio,
          createdAt: user.createdAt,
        },
        memberships: memberships.map((m) => ({
          groupName: m.group?.name,
          groupCode: m.group?.code,
          projectTitle: m.group?.project?.title,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        projects,
        tasks,
        activity: user.activity ?? [],
      };

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contribu-export-${user.studentId}-${Date.now()}.json"`,
      );
      res.setHeader("Content-Type", "application/json");
      res.json(exportPayload);
    } catch (err) {
      next(err);
    }
  },
};

// import User from "../models/User.js";
// import { getPagination, paginatedResponse } from "../utils/pagination.js";

// export default {
//   listUsers: async (req, res, next) => {
//     try {
//       const { page, limit, skip } = getPagination(req.query);
//       const filter = {};
//       if (req.query.role) filter.role = req.query.role;
//       if (req.query.q) {
//         filter.$or = [
//           { name: { $regex: req.query.q, $options: "i" } },
//           { email: { $regex: req.query.q, $options: "i" } },
//         ];
//       }
//       const [users, total] = await Promise.all([
//         User.find(filter).select("-password").skip(skip).limit(limit),
//         User.countDocuments(filter),
//       ]);
//       res.json(paginatedResponse(users, total, page, limit));
//     } catch (err) {
//       next(err);
//     }
//   },

//   getUser: async (req, res, next) => {
//     try {
//       const user = await User.findById(req.params.id).select("-password");
//       if (!user) {
//         res.status(404);
//         throw new Error("User not found");
//       }
//       res.json(user);
//     } catch (err) {
//       next(err);
//     }
//   },

//   updateUser: async (req, res, next) => {
//     try {
//       const isSelf = String(req.user._id) === String(req.params.id);
//       const isAdmin = req.user.role === "admin";

//       if (!isSelf && !isAdmin) {
//         res.status(403);
//         throw new Error("Not authorized to update this user.");
//       }

//       const {
//         name,
//         studentId,
//         role,
//         isActive,
//         department,
//         bio,
//         twoFactorEnabled,
//       } = req.body;

//       // Fields any user can edit about themselves
//       const updates = {};
//       if (name !== undefined) updates.name = name;
//       if (studentId !== undefined) updates.studentId = studentId;
//       if (department !== undefined) updates.department = department;
//       if (bio !== undefined) updates.bio = bio;
//       if (twoFactorEnabled !== undefined) {
//         updates.twoFactorEnabled = Boolean(twoFactorEnabled);
//       }

//       // Admin-only fields
//       if (isAdmin) {
//         if (role) updates.role = role;
//         if (typeof isActive === "boolean") updates.isActive = isActive;
//       }

//       const user = await User.findByIdAndUpdate(req.params.id, updates, {
//         new: true,
//         runValidators: true,
//       }).select("-password");

//       if (!user) {
//         res.status(404);
//         throw new Error("User not found");
//       }
//       res.json(user);
//     } catch (err) {
//       next(err);
//     }
//   },

//   deleteUser: async (req, res, next) => {
//     try {
//       const user = await User.findByIdAndDelete(req.params.id);
//       if (!user) {
//         res.status(404);
//         throw new Error("User not found");
//       }
//       res.json({ message: "User deleted" });
//     } catch (err) {
//       next(err);
//     }
//   },

//   getActivity: async (req, res, next) => {
//     try {
//       const user = await User.findById(req.user._id).select("activity");
//       if (!user) {
//         res.status(404);
//         throw new Error("User not found");
//       }
//       // newest 20, newest first
//       const recent = [...(user.activity ?? [])]
//         .sort((a, b) => new Date(b.at) - new Date(a.at))
//         .slice(0, 20);
//       res.json(recent);
//     } catch (err) {
//       next(err);
//     }
//   },
// };
