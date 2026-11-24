import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import Notification from "../models/Notification.js";
import { generateInviteCode } from "../utils/inviteCode.js";

export default {
  // ── Create ────────────────────────────────────────────────────────
  createProject: async (req, res, next) => {
    try {
      if (req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Only lecturers can create tasks");
      }

      const {
        title,
        description = "",
        course,
        deadline,
        rubric,
        requireIndividualEvidence = true,
        assignedTo,
        groups,
        priority = "medium",
      } = req.body;

      if (!title) {
        res.status(400);
        throw new Error("Task title is required");
      }

      const projectId = generateInviteCode();

      const task = await Project.create({
        title,
        description,
        projectId: undefined, // pre-validate hook generates it
        inviteCode: projectId,
        course: course ?? "",
        deadline: deadline ? new Date(deadline) : null,
        rubric: rubric ?? "",
        requireIndividualEvidence,
        assignedTo: assignedTo ?? null,
        lecturer: req.user._id,
        numberOfGroups: groups ?? "",
        priority,
        createdBy: req.user._id,
        active: true,
      });
      //console.log(task);

      if (assignedTo) {
        await this._notifyAssignment(assignedTo, task, req.user._id);
      }
      res.status(201).json(task);
    } catch (err) {
      next(err);
    }
  },

  // ── List (role aware) ────────────────────────────────────────────
  listProjects: async (req, res, next) => {
    //console.log("user_id", req.user._id);
    try {
      const filter = {};
      if (req.query.project) filter.project = req.query.project;
      if (req.query.group) filter.assignedTo = req.query.group;
      if (req.query.status) filter.status = req.query.status;

      if (req.user.role === "lecturer") {
        const projects = await Project.find({
          lecturer: req.user._id,
        }).select("_id");
        filter._id = req.query.project
          ? req.query.project
          : { $in: projects.map((p) => p._id) };
        //console.log("projects", projects);
      } else {
        // leader/member: tasks assigned to their groups
        const memberships = await GroupMember.find({
          user: req.user._id,
        }).select("group");
        filter.assignedTo = { $in: memberships.map((m) => m.group) };
      }

      const tasks = await Project.find(filter)
        .populate("assignedTo", "name code project")
        .populate("createdBy", "name email")
        .populate("project", "title course deadline")
        .sort("-createdAt");
      //console.log("tasks:", tasks, filter);
      res.json(tasks);
    } catch (err) {
      next(err);
    }
  },

  // ── Get one ───────────────────────────────────────────────────────
  getProject: async (req, res, next) => {
    try {
      const task = await Project.findById(req.params.id)
        .populate("assignedTo", "name code project")
        .populate("createdBy", "name email")
        .populate("project", "title course deadline lecturer");

      if (!task) {
        res.status(404);
        throw new Error("Task not found");
      }

      // Access: lecturer who owns the project, or a member of the assigned group
      const isOwner =
        task.project && String(task.project.lecturer) === String(req.user._id);
      let isGroupMember = false;
      if (task.assignedTo) {
        const m = await GroupMember.findOne({
          user: req.user._id,
          group: task.assignedTo._id,
        });
        isGroupMember = Boolean(m);
      }

      if (!isOwner && !isGroupMember) {
        res.status(403);
        throw new Error("Not authorized to view this task");
      }

      res.json(task);
    } catch (err) {
      next(err);
    }
  },

  // ── Update ────────────────────────────────────────────────────────
  updateProject: async (req, res, next) => {
    try {
      const task = await Project.findById(req.params.id);
      if (!task) {
        res.status(404);
        throw new Error("Task not found");
      }

      // const project = task.project
      //   ? await Project.findById(task.project)
      //   : null;
      const isLecturerOwner =
        task && String(task?.lecturer) === String(req.user._id);

      // Leaders of the assigned group can update status/progress fields
      let isGroupLeader = false;
      if (task.assignedTo) {
        const m = await GroupMember.findOne({
          user: req.user._id,
          group: task.assignedTo,
          role: "leader",
        });
        isGroupLeader = Boolean(m);
      }

      if (!isLecturerOwner && !isGroupLeader) {
        res.status(403);
        throw new Error("Not authorized to update this task");
      }

      const lecturerFields = [
        "title",
        "description",
        "course",
        "deadline",
        "rubric",
        "requireIndividualEvidence",
        "assignedTo",
        "priority",
      ];
      const leaderFields = ["status", "completedAt", "progress"];

      const updates = {};
      if (isLecturerOwner) {
        for (const k of lecturerFields) {
          if (req.body[k] !== undefined) updates[k] = req.body[k];
        }
      }
      for (const k of leaderFields) {
        if (req.body[k] !== undefined) updates[k] = req.body[k];
      }

      if (updates.status === "done" && !updates.completedAt) {
        updates.completedAt = new Date();
      }
      if (updates.status && updates.status !== "done") {
        updates.completedAt = null;
      }
      // console.log(req.body);
      const updated = await Project.findByIdAndUpdate(task._id, {
        ...updates,
        numberOfGroups: req.body.numberOfGroups,
      })
        .populate("assignedTo", "name code")
        .populate("createdBy", "name email")
        .populate("project", "title course");

      if (
        updates.assignedTo &&
        updates.assignedTo !== String(task.assignedTo)
      ) {
        await this._notifyAssignment(updates.assignedTo, updated, req.user._id);
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // ── Assign to a group ────────────────────────────────────────────
  assignProject: async (req, res, next) => {
    try {
      const { groupId } = req.body;
      const task = await Task.findById(req.params.id);
      if (!task) {
        res.status(404);
        throw new Error("Task not found");
      }

      const project = await Project.findById(task.project);
      if (!project || String(project.lecturer) !== String(req.user._id)) {
        res.status(403);
        throw new Error("Only the project lecturer can assign tasks");
      }

      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      if (String(group.project) !== String(task.project)) {
        res.status(400);
        throw new Error("Group does not belong to this task's project");
      }

      task.assignedTo = group._id;
      await task.save();

      if (group.leader) {
        await this._notifyAssignment(group.leader, task, req.user._id);
      }

      const populated = await Task.findById(task._id)
        .populate("assignedTo", "name code")
        .populate("project", "title course");

      res.json(populated);
    } catch (err) {
      next(err);
    }
  },

  // ── Delete (soft) ────────────────────────────────────────────────
  deleteProject: async (req, res, next) => {
    try {
      const task = await Project.findById(req.params.id);
      if (!task) {
        res.status(404);
        throw new Error("Project not found");
      }

      const project = task.project
        ? await Project.findById(task.project)
        : null;
      if (!task || String(task.lecturer) !== String(req.user._id)) {
        res.status(403);
        throw new Error("Only the project lecturer can delete tasks");
      }

      task.active = false;
      await task.save();

      res.json({ message: "Task archived", task });
    } catch (err) {
      next(err);
    }
  },

  // ── Helper: notify a leader/group of a new task ──────────────────
  _notifyAssignment: async (groupId, task, actorId) => {
    // groupId may be an ObjectId or a User id (legacy callers)
    const group = await Group.findById(groupId).catch(() => null);
    if (!group) return;

    const recipients = [group.leader, ...(group.groupMembers ?? [])].filter(
      Boolean,
    );

    if (recipients.length === 0) return;

    await Notification.insertMany(
      recipients.map((userId) => ({
        user: userId,
        type: "task",
        title: `New task: ${task.title}`,
        message: `Task "${task.title}" was assigned to your group "${group.name}".`,
        link: `/tasks/${task._id}`,
        meta: { group: group._id, project: task.project, actor: actorId },
      })),
    );
  },
  // ── Look up by invite code (public-ish, but auth-required) ────────
  findByCode: async (req, res, next) => {
    try {
      const code = String(req.params.code ?? "")
        .trim()
        .toUpperCase();
      if (!code) {
        res.status(400);
        throw new Error("Invite code is required");
      }

      const project = await Project.findOne({
        inviteCode: code,
        status: "active",
      })
        .populate("lecturer", "name email")
        .populate({
          path: "groups", // virtual or manual join; see note below
          select: "name code leader groupMembers active",
          populate: { path: "leader", select: "name email" },
        });

      if (!project) {
        res.status(404);
        throw new Error("No active project matches that code");
      }

      // Load groups manually (Project schema has no virtual `groups`)
      const groups = await Group.find({
        project: project._id,
        active: true,
      })
        .populate("leader", "name email")
        .select("name code groupMembers leader");

      const availableGroups = groups.map((g) => ({
        _id: g._id,
        name: g.name,
        code: g.code,
        leaderName: g.leader?.name ?? null,
        memberCount: g.groupMembers?.length ?? 0,
      }));

      res.json({
        _id: project._id,
        title: project.title,
        course: project.course,
        deadline: project.deadline,
        lecturer: project.lecturer,
        groups: availableGroups,
      });
    } catch (err) {
      next(err);
    }
  },

  // ── Join a group by invite code + group id ────────────────────────
  joinByCode: async (req, res, next) => {
    try {
      const { code, groupId } = req.body;
      if (!code || !groupId) {
        res.status(400);
        throw new Error("Invite code and group id are required");
      }

      const project = await Project.findOne({
        inviteCode: String(code).trim().toUpperCase(),
        status: "active",
      });
      if (!project) {
        res.status(404);
        throw new Error("Invalid invite code");
      }

      const group = await Group.findOne({
        _id: groupId,
        project: project._id,
        active: true,
      });
      if (!group) {
        res.status(404);
        throw new Error("Group not found in this project");
      }

      // Already a member? Return 200, no duplicate.
      const existing = await GroupMember.findOne({
        group: group._id,
        user: req.user._id,
      });
      if (existing) {
        return res.json({ group, alreadyMember: true });
      }

      group.groupMembers = [...(group.groupMembers ?? []), req.user._id];
      await group.save();

      await GroupMember.updateOne(
        { group: group._id, user: req.user._id },
        { $setOnInsert: { role: "member", joinedAt: new Date() } },
        { upsert: true },
      );

      await User.updateOne(
        { _id: req.user._id },
        { $addToSet: { project: project._id } },
      );

      // Notify the leader
      if (group.leader) {
        await Notification.create({
          user: group.leader,
          type: "group",
          title: `${req.user.name ?? "A student"} joined ${group.name}`,
          message: `${req.user.name ?? "A student"} joined your group "${group.name}" via invite code.`,
          link: `/groups/${group._id}`,
          meta: { group: group._id, project: project._id },
        });
      }

      res.status(201).json({ group, project });
    } catch (err) {
      next(err);
    }
  },
  archiveProject: async (req, res, next) => {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) {
        res.status(404);
        throw new Error("Project not found");
      }
      if (String(project.lecturer) !== String(req.user._id)) {
        res.status(403);
        throw new Error("Not authorized to archive this project");
      }

      project.status = "archived";
      await project.save();

      await Group.updateMany(
        { project: project._id },
        { $set: { active: false } },
      );

      await Notification.insertMany(
        (await User.find({ project: project._id }).select("_id")).map((u) => ({
          user: u._id,
          type: "general",
          title: `Project archived: ${project.title}`,
          message: `The project "${project.title}" has been archived by the lecturer.`,
          link: `/projects/${project._id}`,
          meta: { project: project._id, actor: req.user._id },
        })),
      );

      res.json(project);
    } catch (err) {
      next(err);
    }
  },
};
