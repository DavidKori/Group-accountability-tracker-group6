import Notification from "../models/Notification.js";
import { getPagination, paginatedResponse } from "../utils/pagination.js";

export default {
  listNotifications: async (req, res, next) => {
    try {
      const { page, limit, skip } = getPagination(req.query);
      const filter = { user: req.user._id };
      if (req.query.unread === "true") filter.read = false;
      const [items, total] = await Promise.all([
        Notification.find(filter).sort("-createdAt").skip(skip).limit(limit),
        Notification.countDocuments(filter),
      ]);
      res.json(paginatedResponse(items, total, page, limit));
    } catch (err) {
      next(err);
    }
  },
  unreadCount: async (req, res, next) => {
    try {
      const count = await Notification.countDocuments({
        user: req.user._id,
        read: false,
      });
      res.json({ count });
    } catch (err) {
      next(err);
    }
  },
  markRead: async (req, res, next) => {
    try {
      const n = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { read: true },
        { new: true },
      );
      if (!n) {
        res.status(404);
        throw new Error("Notification not found");
      }
      res.json(n);
    } catch (err) {
      next(err);
    }
  },

  markAllRead: async (req, res, next) => {
    try {
      await Notification.updateMany(
        { user: req.user._id, read: false },
        { read: true },
      );
      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      next(err);
    }
  },
  deleteNotification: async (req, res, next) => {
    try {
      await Notification.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      });
      res.json({ message: "Notification deleted" });
    } catch (err) {
      next(err);
    }
  },
};
