// controllers/reportController.js
import reportService from "../services/reportService.js";
import Group from "../models/Group.js";
import GroupMember from "../models/GroupMember.js";

// ── Access check: lecturer owns the project, or user is in the group ──
const canAccessGroup = async (user, groupId) => {
  const group = await Group.findById(groupId).populate("project", "lecturer");
  if (!group) return { ok: false, group: null };

  if (user.role === "lecturer" || user.role === "admin") {
    const isOwner =
      group.project && String(group.project.lecturer) === String(user._id);
    return { ok: isOwner || user.role === "admin", group };
  }

  // leader / member
  const m = await GroupMember.findOne({ group: groupId, user: user._id });
  return { ok: Boolean(m), group, role: m?.role ?? null };
};

export default {
  // ── Live preview, no persistence ────────────────────────────────
  previewReport: async (req, res, next) => {
    try {
      const { ok } = await canAccessGroup(req.user, req.params.groupId);
      if (!ok) {
        res.status(403);
        throw new Error("Not authorized to view this group's report");
      }
      const data = await reportService.previewReport(req.params.groupId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // ── Latest report (or live if none saved yet) ───────────────────
  groupReport: async (req, res, next) => {
    try {
      const { ok } = await canAccessGroup(req.user, req.params.groupId);
      if (!ok) {
        res.status(403);
        throw new Error("Not authorized to view this group's report");
      }

      const reports = await reportService.listReports(req.params.groupId);
      if (reports.length > 0) {
        return res.json({ latest: reports[0], history: reports });
      }

      // No saved reports yet — return a live preview instead of 404
      const preview = await reportService.previewReport(req.params.groupId);
      return res.json({ latest: null, history: [], preview });
    } catch (err) {
      next(err);
    }
  },

  // ── Persist a new snapshot
  generateReport: async (req, res, next) => {
    try {
      const { ok, role } = await canAccessGroup(req.user, req.params.groupId);
      if (!ok) {
        res.status(403);
        throw new Error("Not authorized to generate this report");
      }

      // Leaders can only generate for their own groups — canAccessGroup

      if (
        req.user.role === "leader" &&
        role !== "leader" &&
        req.user.role !== "admin"
      ) {
        res.status(403);
        throw new Error("Only the group leader can generate this report");
      }

      const report = await reportService.generateAndSaveReport(
        req.params.groupId,
        req.user._id,
      );
      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  },

  // ── Past snapshots ──────────────────────────────────────────────
  listReports: async (req, res, next) => {
    try {
      const { ok } = await canAccessGroup(req.user, req.params.groupId);
      if (!ok) {
        res.status(403);
        throw new Error("Not authorized to view report history");
      }
      const reports = await reportService.listReports(req.params.groupId);
      res.json(reports);
    } catch (err) {
      next(err);
    }
  },

  // ── Single report by id ─────────────────────────────────────────
  getReport: async (req, res, next) => {
    try {
      const report = await reportService.getReport(req.params.reportId);
      if (!report) {
        res.status(404);
        throw new Error("Report not found");
      }
      const { ok } = await canAccessGroup(
        req.user,
        report.group?._id ?? report.group,
      );
      if (!ok) {
        res.status(403);
        throw new Error("Not authorized to view this report");
      }
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
};
