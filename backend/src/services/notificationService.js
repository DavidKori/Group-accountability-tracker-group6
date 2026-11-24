import Notification from "../models/Notification.js";

const notificationService = {
  notify: async ({ user, message, link = "", type = "general" }) => {
    if (!user) return null;
    return Notification.create({ user, message, link, type });
  },

  notifyMany: async (userIds, payload) => {
    if (!userIds?.length) return [];
    const docs = userIds.map((user) => ({ ...payload, user }));
    return Notification.insertMany(docs);
  },
};
export default notificationService;
