import ContributionReport from "../models/Contributionreport.js";
import calculateContribution from "./contributionService.js";
import Group from "../models/Group.js";

// ── Generate and persist a contribution report snapshot ────────────
const generateAndSaveReport = async (groupId, generatedBy) => {
  const group = await Group.findById(groupId);
  if (!group) throw new Error("Group not found");

  const data = await calculateContribution(groupId);

  const report = await ContributionReport.create({
    group: groupId,
    generatedBy,
    perMember: data.perMember.map((m) => ({
      user: m.user._id,
      totalTasks: m.totalTasks,
      completedTasks: m.completedTasks,
      submissions: m.submissions,
      contribution: m.contribution,
    })),
    summary: {
      totalTasks: data.totalTasks,
      completedTasks: data.completedTasks,
      progress: data.progress,
    },
  });

  const populated = await report.populate(
    "perMember.user",
    "name email studentId avatar",
  );
  return populated;
};

// ── List past reports for a group ──────────────────────────────────
const listReports = async (groupId) =>
  ContributionReport.find({ group: groupId })
    .populate("perMember.user", "name email studentId avatar")
    .populate("generatedBy", "name email")
    .sort("-createdAt");

// ── Get a single report ────────────────────────────────────────────
const getReport = async (reportId) =>
  ContributionReport.findById(reportId)
    .populate("perMember.user", "name email studentId avatar")
    .populate("generatedBy", "name email")
    .populate("group", "name code project");

// ── Live contribution snapshot without persisting ─────────────────
const previewReport = async (groupId) => calculateContribution(groupId);

export default {
  generateAndSaveReport,
  listReports,
  getReport,
  previewReport,
};

// import ContributionReport from "../models/Contributionreport.js";
// import calculateContribution from "./contributionService.js";

// const generateAndSaveReport = async (groupId, generatedBy) => {
//   const data = await calculateContribution(groupId);
//   const report = await ContributionReport.create({
//     group: groupId,
//     generatedBy,
//     perMember: data.perMember.map((m) => ({
//       user: m.user._id,
//       totalTasks: m.totalTasks,
//       completedTasks: m.completedTasks,
//       submissions: m.submissions,
//       contribution: m.contribution,
//     })),
//     summary: {
//       totalTasks: data.totalTasks,
//       completedTasks: data.completedTasks,
//     },
//   });
//   return report.populate("perMember.user", "name email");
// };

// const listReports = async (groupId) =>
//   ContributionReport.find({ group: groupId })
//     .populate("perMember.user", "name email")
//     .sort("-createdAt");
// export default { generateAndSaveReport, listReports };
