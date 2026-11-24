import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";
import Answer from "../models/Answers.js";
import Assessment from "../models/Assesment.js";

/**
 * Compute contribution data for a group from its embedded subtasks
 * and any assessment answers submitted by its members.
 *
 * Returns per-member breakdown used by the leader reports page and
 * persisted by the report service.
 */
const calculateContribution = async (groupId) => {
  const group = await Group.findById(groupId)
    .populate("groupMembers", "name email studentId avatar")
    .populate("leader", "name email studentId avatar");

  if (!group) throw new Error("Group not found");

  const memberships = await GroupMember.find({ group: groupId });
  const roleByUser = Object.fromEntries(
    memberships.map((m) => [String(m.user), m.role]),
  );

  const subtasks = group.subtasks ?? [];

  // Fetch any submitted answers for assessments that target this group
  const assessments = await Assessment.find({ groups: groupId }).select("_id");
  const assessmentIds = assessments.map((a) => a._id);
  const answers = assessmentIds.length
    ? await Answer.find({
        assessment: { $in: assessmentIds },
        status: "submitted",
      }).select("user assessment submittedAt")
    : [];

  const submissionCountByUser = answers.reduce((acc, a) => {
    const key = String(a.user);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Per-member aggregation
  const members = (group.groupMembers ?? []).map((member) => {
    const userSubtasks = subtasks.filter(
      (s) => String(s.assignee) === String(member._id),
    );
    const totalTasks = userSubtasks.length;
    const completedTasks = userSubtasks.filter(
      (s) => s.status === "done",
    ).length;
    const inProgressTasks = userSubtasks.filter(
      (s) => s.status === "in-progress",
    ).length;
    const submissions = submissionCountByUser[String(member._id)] ?? 0;

    const taskProgress = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return {
      user: {
        _id: member._id,
        name: member.name,
        email: member.email,
        studentId: member.studentId,
        avatar: member.avatar,
      },
      role: roleByUser[String(member._id)] ?? "member",
      totalTasks,
      completedTasks,
      inProgressTasks,
      submissions,
      taskProgress,
      contribution: taskProgress, // placeholder; finalized below
    };
  });

  // Contribution score = share of group's completed subtasks + share of submissions
  const totalCompleted = members.reduce((sum, m) => sum + m.completedTasks, 0);
  const totalSubmissions = members.reduce((sum, m) => sum + m.submissions, 0);

  for (const m of members) {
    const taskShare = totalCompleted
      ? (m.completedTasks / totalCompleted) * 100
      : 0;
    const submissionShare = totalSubmissions
      ? (m.submissions / totalSubmissions) * 100
      : 0;
    // Blend: 70% task completion share, 30% submission share
    m.contribution = Math.round(taskShare * 0.7 + submissionShare * 0.3);
  }

  const totalTasks = subtasks.length;
  const completedTasks = subtasks.filter((s) => s.status === "done").length;

  return {
    group: {
      _id: group._id,
      name: group.name,
      code: group.code,
      project: group.project,
      leader: group.leader,
    },
    perMember: members,
    totalTasks,
    completedTasks,
    progress: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
  };
};

export default calculateContribution;
