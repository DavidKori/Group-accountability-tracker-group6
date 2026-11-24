import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import User from "../models/User.js";

// ── Fetch a group with all its relations populated ─────────────────
export const getGroupDetail = async (groupId) => {
  const group = await Group.findById(groupId)
    .populate("leader", "name email studentId avatar")
    .populate("groupMembers", "name email studentId avatar role")
    .populate("project", "title course deadline lecturer");

  if (!group) throw new Error("Group not found");

  // Ensure subtask progress is computed against the embedded array
  const subtasks = group.subtasks ?? [];
  const total = subtasks.length;
  const done = subtasks.filter((s) => s.status === "done").length;
  const inProgress = subtasks.filter((s) => s.status === "in-progress").length;

  return {
    group: group.toObject(),
    stats: {
      totalSubtasks: total,
      done,
      inProgress,
      todo: total - done - inProgress,
      progress: total ? Math.round((done / total) * 100) : 0,
      memberCount: group.groupMembers?.length ?? 0,
    },
  };
};

// ── Compute per-member workload for a single group ─────────────────
export const getMemberWorkload = async (groupId) => {
  const group = await Group.findById(groupId).populate(
    "groupMembers",
    "name email studentId avatar",
  );

  if (!group) throw new Error("Group not found");

  const subtasks = group.subtasks ?? [];

  const byMember = new Map();

  // Seed every member so users with 0 subtasks still appear
  for (const member of group.groupMembers ?? []) {
    byMember.set(String(member._id), {
      user: member,
      total: 0,
      done: 0,
      inProgress: 0,
      todo: 0,
      progress: 0,
    });
  }

  for (const subtask of subtasks) {
    if (!subtask.assignee) continue;
    const key = String(subtask.assignee);
    if (!byMember.has(key)) continue; // assignee no longer in group
    const entry = byMember.get(key);
    entry.total += 1;
    if (subtask.status === "done") entry.done += 1;
    else if (subtask.status === "in-progress") entry.inProgress += 1;
    else entry.todo += 1;
  }

  const members = Array.from(byMember.values()).map((m) => ({
    ...m,
    progress: m.total ? Math.round((m.done / m.total) * 100) : 0,
    status:
      m.total === 0 || m.done === m.total
        ? "On track"
        : m.progress < 30
          ? "Needs support"
          : "On track",
  }));

  return { group: group.toObject(), members };
};

// ── Determine a user's role in a group ────────────────────────────
export const getMyRole = async (groupId, userId) => {
  if (!groupId || !userId) return null;
  const m = await GroupMember.findOne({ group: groupId, user: userId });
  return m?.role ?? null;
};

// ── Legacy helper kept for other callers ──────────────────────────
export const isMember = async (groupId, userId) => {
  if (!groupId || !userId) return false;
  const m = await GroupMember.findOne({ group: groupId, user: userId });
  return Boolean(m);
};

// ── Recompute & persist the `ready` flag for a group ───────────────
// A group is "ready" when every subtask is done.
export const refreshGroupReadyFlag = async (groupId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");
  const subtasks = group.subtasks ?? [];
  const allDone =
    subtasks.length > 0 && subtasks.every((s) => s.status === "done");
  group.ready = allDone;
  await group.save();
  return group.ready;
};

// ── Reassign every subtask from one user to another ────────────────
export const reassignSubtasks = async (groupId, fromUserId, toUserId) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  let changed = 0;
  for (const subtask of group.subtasks) {
    if (String(subtask.assignee) === String(fromUserId)) {
      subtask.assignee = toUserId;
      changed += 1;
    }
  }
  if (changed > 0) await group.save();
  return changed;
};

// ── Aggregate stats across multiple groups (for a leader) ──────────
export const aggregateGroupStats = (groups) => {
  const list = Array.isArray(groups) ? groups : [];
  const totals = list.reduce(
    (acc, g) => {
      const subtasks = g.subtasks ?? [];
      acc.total += subtasks.length;
      acc.done += subtasks.filter((s) => s.status === "done").length;
      acc.inProgress += subtasks.filter(
        (s) => s.status === "in-progress",
      ).length;
      return acc;
    },
    { total: 0, done: 0, inProgress: 0 },
  );

  return {
    groupCount: list.length,
    ...totals,
    todo: totals.total - totals.done - totals.inProgress,
    progress: totals.total ? Math.round((totals.done / totals.total) * 100) : 0,
  };
};
