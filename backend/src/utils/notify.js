import Notification from "../models/Notification.js";

/**
 * Create notifications for one or more users.
 * Skips falsy ids and de-duplicates.
 */
export async function notifyUsers({
  userIds = [],
  actor,
  group,
  project,
  leader,
  members,
  title = "",
  message,
  link = "",
  type = "group",
}) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (uniqueIds.length === 0 || !message) return [];

  const docs = uniqueIds.map((userId) => ({
    user: userId,
    type,
    title,
    message,
    link,
    meta: { actor, group, project, leader, members },
  }));

  return Notification.insertMany(docs);
}

/** Add a project id to each user's `project` array without duplicates. */
export async function addProjectToUsers(userIds, projectId) {
  const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
  if (uniqueIds.length === 0 || !projectId) return;

  await User.updateMany(
    { _id: { $in: uniqueIds } },
    { $addToSet: { project: projectId } },
  );
}
