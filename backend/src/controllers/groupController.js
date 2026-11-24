import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

//const uniqueIds = (ids) => [...new Set(ids.filter(Boolean).map(String))];
const toUserId = (value) => {
  if (!value) return null;

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  const id = typeof value === "object" ? value._id : value;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid user ID: ${id}`);
  }

  return new mongoose.Types.ObjectId(id);
};

const uniqueIds = (ids) => [
  ...new Map(
    ids
      .filter(Boolean)
      .map(toUserId)
      .map((id) => [String(id), id]),
  ).values(),
];
// Keep User.groups in step with membership: add the group id to each user…
const addGroupToUsers = async (groupId, userIds) => {
  const ids = uniqueIds(userIds);
  if (!ids.length) return;
  await User.updateMany(
    { _id: { $in: ids } },
    { $addToSet: { groups: groupId } },
  );
};

// …and take it away again when they leave the group.
const removeGroupFromUsers = async (groupId, userIds) => {
  const ids = uniqueIds(userIds);
  if (!ids.length) return;
  await User.updateMany({ _id: { $in: ids } }, { $pull: { groups: groupId } });
};

// Keep Group.leader / Group.groupMembers, GroupMember docs and User.groups in sync.
const syncGroupMembers = async (groupId, memberIds, leaderId) => {
  const keep = uniqueIds([...memberIds, leaderId]);

  // Remove stale memberships (and the group id from those users)
  const stale = await GroupMember.find({
    group: groupId,
    user: { $nin: keep },
  }).select("user");
  await GroupMember.deleteMany({
    group: groupId,
    user: { $nin: keep },
  });
  await removeGroupFromUsers(
    groupId,
    stale.map((s) => s.user),
  );

  // Upsert leader
  if (leaderId) {
    await GroupMember.updateOne(
      { group: groupId, user: leaderId },
      { $set: { role: "leader", joinedAt: new Date() } },
      { upsert: true },
    );
  }

  // Upsert plain members (skip leader — role already set)
  const plainMembers = keep.filter((id) => String(id) !== String(leaderId));
  if (plainMembers.length) {
    const ops = plainMembers.map((userId) => ({
      updateOne: {
        filter: { group: groupId, user: userId },
        update: { $setOnInsert: { role: "member", joinedAt: new Date() } },
        upsert: true,
      },
    }));
    await GroupMember.bulkWrite(ops);
  }

  // Demote anyone who used to be a leader but isn't now
  await GroupMember.updateMany(
    {
      group: groupId,
      role: "leader",
      user: { $ne: leaderId },
    },
    { $set: { role: "member" } },
  );

  // Every current member (leader included) carries this group id
  await addGroupToUsers(groupId, keep);
};

export default {
  // ── Create one or many groups ─────────────────────────────────────

  createGroup: async (req, res, next) => {
    try {
      const {
        name,
        project,
        members = 5,
        leader,
        code,
        initials,
        numberOfGroups = 1,
        groupLabelType = "alpha",
        singleGroup = true,
        leaderSelection = "random",
        memberSelection = "manual",
        groupMembers = [],
        task,
        due,
      } = req.body;

      // `project` may arrive as ObjectId or as a Task.taskId
      let projDoc = null;

      if (project) {
        projDoc =
          (await Project.findById(project).catch(() => null)) ??
          (await Project.findOne({ title: project }));
      }

      if (!projDoc) {
        res.status(404);
        throw new Error("Project not found");
      }

      const actorId = req.user._id;
      const actorDoc = await User.findById(actorId).select("name");
      const actorName = actorDoc?.name ?? "A lecturer";

      const eligibleStudents = await User.find({
        role: { $in: ["member", "leader"] },
        isActive: true,
        _id: { $ne: actorId },
        project: { $ne: projDoc._id },
      }).select("name studentId");

      const assignedAcrossGroups = new Set();
      const createdGroups = [];

      const groupCount = singleGroup ? 1 : Math.max(1, Number(numberOfGroups));

      const labelFor = (i) =>
        groupLabelType === "alpha"
          ? String.fromCharCode(65 + i)
          : String(i + 1);

      for (let g = 0; g < groupCount; g++) {
        const suffix = groupCount > 1 ? ` ${labelFor(g)}` : "";
        const groupName = `${name}${suffix}`;

        // ── Leader ─────────────────────────────────────────
        let leaderDoc = null;

        if (leaderSelection === "manual" && Array.isArray(leader)) {
          const selectedLeader = leader[g];

          if (selectedLeader) {
            leaderDoc = await User.findById(toUserId(selectedLeader));
          }
        } else if (leaderSelection === "manual" && leader) {
          leaderDoc = await User.findById(toUserId(leader));
        } else {
          const pool = eligibleStudents.filter(
            (s) => !assignedAcrossGroups.has(String(s._id)),
          );

          if (pool.length > 0) {
            leaderDoc = pool[Math.floor(Math.random() * pool.length)];
          }
        }

        const leaderId = leaderDoc?._id ?? actorId;

        // ── Members ────────────────────────────────────────
        let chosenMemberIds = [];

        if (memberSelection === "manual" && groupCount === 1) {
          chosenMemberIds = uniqueIds(groupMembers);
        } else if (memberSelection === "random") {
          const pool = eligibleStudents.filter(
            (s) =>
              !assignedAcrossGroups.has(String(s._id)) &&
              String(s._id) !== String(leaderId),
          );

          const count = Math.max(0, Number(members));

          chosenMemberIds = shuffle(pool)
            .slice(0, count)
            .map((s) => s._id);
        }

        const allMemberIds = uniqueIds([...chosenMemberIds, leaderId]);

        // ── Create group ───────────────────────────────────
        const group = await Group.create({
          name: groupName,
          project: projDoc._id,
          leader: leaderId,
          groupMembers: allMemberIds,
          code,
          initials,
          numberOfGroups: groupCount,
          members: Number(members),
          groupLabelType,
          singleGroup,
          leaderSelection,
          memberSelection,
          task,
          due,
          active: true,
        });

        createdGroups.push(group);

        allMemberIds.forEach((id) => assignedAcrossGroups.add(String(id)));

        // ── Sync GroupMember docs (+ User.groups) ──────────
        await syncGroupMembers(group._id, chosenMemberIds, leaderId);

        // ── Add project + group to members, promote leader ─
        await User.updateMany(
          { _id: { $in: allMemberIds } },
          {
            $addToSet: {
              project: projDoc._id,
              groups: group._id,
            },
          },
        );

        if (leaderDoc && String(leaderId) !== String(actorId)) {
          await User.updateOne({ _id: leaderId }, { $set: { role: "leader" } });
        }

        // ── Notifications ──────────────────────────────────
        const memberDocs = await User.find({
          _id: { $in: allMemberIds },
        }).select("name");

        const leaderName = leaderDoc?.name ?? "the appointed leader";

        const memberNames = memberDocs
          .filter((m) => String(m._id) !== String(leaderId))
          .map((m) => m.name)
          .filter(Boolean);

        const message =
          `You were added to group "${groupName}"` +
          (projDoc.title ? ` for project "${projDoc.title}"` : "") +
          ` by ${actorName}. Leader: ${leaderName}. Members: ${
            memberNames.join(", ") || "none"
          }.`;

        if (allMemberIds.length > 0) {
          await Notification.insertMany(
            allMemberIds.map((userId) => ({
              user: userId,
              type: "group",
              title: `Added to group ${groupName}`,
              message,
              link: `/groups/${group._id}`,
              meta: {
                actor: actorId,
                group: group._id,
                project: projDoc._id,
                leader: leaderId,
                members: allMemberIds,
              },
            })),
          );
        } else {
          await Notification.create({
            user: actorId,
            type: "group",
            title: `Group ${groupName} created`,
            message: `You created group "${groupName}" with no additional members.`,
            link: `/groups/${group._id}`,
            meta: {
              actor: actorId,
              group: group._id,
              project: projDoc._id,
              leader: leaderId,
              members: [],
            },
          });
        }
      }

      return res
        .status(201)
        .json(createdGroups.length === 1 ? createdGroups[0] : createdGroups);
    } catch (err) {
      next(err);
    }
  },

  // ── List groups scoped by role ────────────────────────────────────
  listGroups: async (req, res, next) => {
    console.log(req.user.role);
    try {
      const filter = {};

      if (req.query.project) {
        filter.project = req.query.project;
      }

      // Non-lecturers can only see groups listed in their groups field
      if (req.user.role !== "lecturer") {
        filter._id = { $in: req.user.groups || [] };
      }
      //console.log(filter);
      const groups = await Group.find(filter)
        .populate("leader", "name email studentId")
        .populate("groupMembers", "name email studentId role")
        .populate("project", "title course deadline description")
        .sort("-createdAt");
      // console.log("Groups:", groups);
      // Annotate each group with the requesting user's role
      const groupIds = groups.map((g) => g._id);

      const myMemberships = await GroupMember.find({
        user: req.user._id,
        group: { $in: groupIds },
      });

      const roleByGroup = Object.fromEntries(
        myMemberships.map((m) => [String(m.group), m.role]),
      );

      const enriched = groups.map((g) => ({
        ...g.toObject(),
        myRole: roleByGroup[String(g._id)] ?? null,
      }));

      res.json(enriched);
    } catch (err) {
      next(err);
    }
  },
  getGroup: async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id)
        .populate("leader", "name email studentId")
        .populate("groupMembers", "name email studentId role")
        .populate({
          path: "project",
          select: "title course deadline description lecturer",
          populate: { path: "lecturer", select: "name email" },
        });

      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }

      const membership = await GroupMember.findOne({
        group: group._id,
        user: req.user._id,
      });

      const subtasks = group.subtasks ?? [];
      const total = subtasks.length;
      const done = subtasks.filter((s) => s.status === "done").length;
      const inProgress = subtasks.filter(
        (s) => s.status === "in-progress",
      ).length;

      res.json({
        ...group.toObject(),
        myRole: membership?.role ?? null,
        subtaskStats: {
          total,
          done,
          inProgress,
          todo: total - done - inProgress,
          progress: total ? Math.round((done / total) * 100) : 0,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  updateGroup: async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);

      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }

      const membership = await GroupMember.findOne({
        group: group._id,
        user: req.user._id,
      });

      const isLecturer = req.user.role === "lecturer";
      const isLeader = membership?.role === "leader";

      if (!isLecturer && !isLeader) {
        res.status(403);
        throw new Error("Not authorized to update this group");
      }

      const allowed = [
        "name",
        "code",
        "task",
        "due",
        "flagged",
        "ready",
        "leader",
        "settings",
        "active",
      ];

      const updates = {};

      for (const k of allowed) {
        if (req.body[k] !== undefined) {
          updates[k] = req.body[k];
        }
      }

      // Normalize the new leader to a MongoDB ObjectId.
      const leaderId = updates.leader ? toUserId(updates.leader) : null;

      // Ensure the new leader is a valid existing user.
      if (leaderId) {
        const newLeader = await User.findById(leaderId);

        if (!newLeader) {
          res.status(404);
          throw new Error("Selected leader does not exist");
        }
      }

      const update = leaderId
        ? {
            ...updates,
            leader: leaderId,
            $addToSet: {
              groupMembers: leaderId,
            },
          }
        : updates;

      const updated = await Group.findByIdAndUpdate(group._id, update, {
        new: true,
        runValidators: true,
      })
        .populate("leader", "name email studentId")
        .populate("groupMembers", "name email studentId role");

      // Synchronize membership only when the leader changes.
      if (leaderId && String(leaderId) !== String(group.leader)) {
        const memberIds = updated.groupMembers.map((m) => m._id);

        await syncGroupMembers(group._id, memberIds, leaderId);

        await User.updateOne({ _id: leaderId }, { $set: { role: "leader" } });
      }

      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  deleteGroup: async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      const project = await Project.findById(group.project);
      const isOwner =
        project && String(project.lecturer) === String(req.user._id);
      if (req.user.role !== "lecturer" && !isOwner) {
        res.status(403);
        throw new Error("Not authorized to archive this group");
      }

      group.active = false;
      group.flagged = true;
      await group.save();
      res.json(group);
    } catch (err) {
      next(err);
    }
  },

  // ── Member management ─────────────────────────────────────────────
  addMember: async (req, res, next) => {
    try {
      const { userId } = req.body;
      const group = await Group.findById(req.params.id);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      const membership = await GroupMember.findOne({
        group: group._id,
        user: req.user._id,
      });
      const isLecturer = req.user.role === "lecturer";
      const isLeader = membership?.role === "leader";
      if (!isLecturer && !isLeader) {
        res.status(403);
        throw new Error("Only the leader or lecturer can add members");
      }

      const newUser = userId ? await User.findById(userId).select("_id") : null;
      if (!newUser) {
        res.status(404);
        throw new Error("User not found");
      }

      if (!group.groupMembers.some((m) => String(m) === String(userId))) {
        group.groupMembers.push(userId);
        await group.save();
      }

      await GroupMember.updateOne(
        { group: group._id, user: userId },
        { $setOnInsert: { role: "member", joinedAt: new Date() } },
        { upsert: true },
      );

      // Project + group id both go onto the user's own record
      await User.updateOne(
        { _id: userId },
        { $addToSet: { project: group.project, groups: group._id } },
      );

      await Notification.create({
        user: userId,
        type: "group",
        title: `Added to ${group.name}`,
        message: `You were added to group "${group.name}".`,
        link: `/groups/${group._id}`,
        meta: { group: group._id, project: group.project, actor: req.user._id },
      });

      const populated = await Group.findById(group._id)
        .populate("leader", "name email studentId")
        .populate("groupMembers", "name email studentId role");
      res.json(populated);
    } catch (err) {
      next(err);
    }
  },

  removeMember: async (req, res, next) => {
    try {
      const { id: groupId, userId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      const membership = await GroupMember.findOne({
        group: groupId,
        user: req.user._id,
      });
      const isLecturer = req.user.role === "lecturer";
      const isLeader = membership?.role === "leader";
      if (!isLecturer && !isLeader) {
        res.status(403);
        throw new Error("Only the leader or lecturer can remove members");
      }

      group.groupMembers = group.groupMembers.filter(
        (m) => String(m) !== String(userId),
      );
      // Clear leader if the removed user was the leader
      if (String(group.leader) === String(userId)) {
        group.leader = group.groupMembers[0] ?? null;
      }
      await group.save();

      await GroupMember.deleteOne({ group: groupId, user: userId });

      if (group.leader) {
        await GroupMember.updateOne(
          { group: groupId, user: group.leader },
          { $set: { role: "leader" } },
          { upsert: true },
        );
      }

      // Remove the group id from the user; drop the project only if they are
      // in no other active group of that project.
      const stillInProject = await Group.exists({
        project: group.project,
        _id: { $ne: group._id },
        active: true,
        groupMembers: userId,
      });
      await User.updateOne(
        { _id: userId },
        {
          $pull: {
            groups: group._id,
            ...(stillInProject ? {} : { project: group.project }),
          },
        },
      );

      const populated = await Group.findById(groupId)
        .populate("leader", "name email studentId")
        .populate("groupMembers", "name email studentId role");
      res.json(populated);
    } catch (err) {
      next(err);
    }
  },

  // ── Subtask CRUD (leader only) ────────────────────────────────────
  listSubtasks: async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      res.json(group.subtasks ?? []);
    } catch (err) {
      next(err);
    }
  },

  createSubtask: async (req, res, next) => {
    try {
      const group = await Group.findById(req.params.id);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      const membership = await GroupMember.findOne({
        group: group._id,
        user: req.user._id,
      });
      // console.log("leader:", membership);
      if (membership?.role !== "leader" && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Only the group leader can create subtasks");
      }

      const { title, description, assignee, priority, dueDate } = req.body;
      if (!title) {
        res.status(400);
        throw new Error("Subtask title is required");
      }

      group.subtasks.push({
        title,
        description: description ?? "",
        assignee: assignee ?? null,
        createdBy: req.user._id,
        priority: priority ?? "medium",
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      await group.save();

      const created = group.subtasks[group.subtasks.length - 1];

      if (assignee) {
        await Notification.create({
          user: assignee,
          type: "task",
          title: `New subtask in ${group.name}`,
          message: `You were assigned "${title}" in group "${group.name}".`,
          link: `/groups/${group._id}`,
          meta: {
            group: group._id,
            project: group.project,
            actor: req.user._id,
          },
        });
      }

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },

  updateSubtask: async (req, res, next) => {
    try {
      const { id: groupId, subtaskId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      const membership = await GroupMember.findOne({
        group: groupId,
        user: req.user._id,
      });
      const subtask = group.subtasks.id(subtaskId);
      if (!subtask) {
        res.status(404);
        throw new Error("Subtask not found");
      }

      const isLeader = membership?.role === "leader";
      const isAssignee = String(subtask.assignee) === String(req.user._id);
      if (!isLeader && !isAssignee && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Not authorized to update this subtask");
      }

      const allowed = [
        "title",
        "description",
        "assignee",
        "status",
        "priority",
        "dueDate",
      ];
      for (const k of allowed) {
        if (req.body[k] !== undefined) subtask[k] = req.body[k];
      }
      if (req.body.status === "done" && !subtask.completedAt) {
        subtask.completedAt = new Date();
      }
      if (req.body.status && req.body.status !== "done") {
        subtask.completedAt = null;
      }

      await group.save();
      res.json(subtask);
    } catch (err) {
      next(err);
    }
  },

  deleteSubtask: async (req, res, next) => {
    try {
      const { id: groupId, subtaskId } = req.params;
      const group = await Group.findById(groupId);
      if (!group) {
        res.status(404);
        throw new Error("Group not found");
      }
      const membership = await GroupMember.findOne({
        group: groupId,
        user: req.user._id,
      });
      if (membership?.role !== "leader" && req.user.role !== "lecturer") {
        res.status(403);
        throw new Error("Only the group leader can delete subtasks");
      }

      group.subtasks = group.subtasks.filter(
        (s) => String(s._id) !== String(subtaskId),
      );
      await group.save();
      res.json({ message: "Subtask deleted" });
    } catch (err) {
      next(err);
    }
  },
};
