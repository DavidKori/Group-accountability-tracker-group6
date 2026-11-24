import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import {
  LAvatar,
  LBadge,
  LButton,
  LIcon,
  LProgress,
  LSelect,
  PageTitle,
  Stat,
} from "../components/LeaderUI.jsx";

const DAY = 24 * 60 * 60 * 1000;

// Normalize any backend status into one of five buckets.
const bucketOf = (task) => {
  const raw = String(task.status ?? "todo").toLowerCase();
  if (["done", "complete", "completed"].includes(raw)) return "done";
  if (["in-progress", "in progress"].includes(raw)) return "progress";
  if (["in-review", "in review", "review", "submitted"].includes(raw))
    return "review";
  if (["revision", "changes_requested"].includes(raw)) return "revision";
  return "todo";
};

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const reportDate = (date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

export default function ReportsPage({
  members: rawMembers,
  tasks: rawTasks,
  groupId,
  notify,
}) {
  const [range, setRange] = useState("Whole project");
  const [archive, setArchive] = useState([]);

  // Apply the selected range to the real tasks (undated tasks are kept).
  const tasks = useMemo(() => {
    const list = Array.isArray(rawTasks) ? rawTasks : [];
    const days = range === "Last 30 days" ? 30 : range === "This week" ? 7 : 0;
    if (!days) return list;
    return list.filter((task) => {
      const date = new Date(task.updatedAt ?? task.createdAt ?? task.dueDate);
      return (
        Number.isNaN(date.getTime()) ||
        Date.now() - date.getTime() <= days * DAY
      );
    });
  }, [rawTasks, range]);

  const members = useMemo(
    () =>
      (rawMembers || []).map((member) => {
        const assigned = tasks.filter(
          (task) =>
            String(task.assignee?._id ?? task.assignee) === String(member._id),
        );
        const completed = assigned.filter((t) => bucketOf(t) === "done").length;
        const tracked = assigned.reduce(
          (sum, t) => sum + (Number(t.hours ?? t.hoursSpent) || 0),
          0,
        );
        return {
          ...member,
          id: member._id,
          initials: initialsOf(member.name),
          completed,
          hours: tracked ? `${Math.round(tracked * 10) / 10}h` : "—",
          contribution: assigned.length
            ? Math.round((completed / assigned.length) * 100)
            : 0,
        };
      }),
    [rawMembers, tasks],
  );

  const metrics = useMemo(() => {
    const total = tasks.length;
    const count = (bucket) =>
      tasks.filter((t) => bucketOf(t) === bucket).length;
    const done = count("done");
    const open = tasks.filter((t) => bucketOf(t) !== "done");
    const overdue = open.filter((t) => {
      const due = new Date(t.dueDate ?? t.deadline);
      return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
    }).length;
    const completePct = total ? Math.round((done / total) * 100) : 0;
    const onTimePct = open.length
      ? Math.round(((open.length - overdue) / open.length) * 100)
      : 100;
    const health = total ? Math.round(completePct * 0.6 + onTimePct * 0.4) : 0;
    const spread = members.length
      ? Math.max(...members.map((m) => m.contribution)) -
        Math.min(...members.map((m) => m.contribution))
      : 0;
    const evidence = tasks.reduce(
      (sum, t) => sum + (t.evidence ?? t.files ?? t.attachments ?? []).length,
      0,
    );
    const hours = tasks.reduce(
      (sum, t) => sum + (Number(t.hours ?? t.hoursSpent) || 0),
      0,
    );
    const ratings = (rawMembers || [])
      .map((m) => Number(m.peerRating ?? m.rating))
      .filter((n) => n > 0);
    return {
      total,
      done,
      completePct,
      overdue,
      health,
      spread,
      evidence,
      hours,
      rating: ratings.length
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null,
      progress: count("progress"),
      review: count("review"),
      // everything not yet in progress, review or done (incl. revisions)
      notStarted: total - count("progress") - count("review") - done,
    };
  }, [tasks, members, rawMembers]);

  const healthTone =
    metrics.health >= 75 ? "green" : metrics.health >= 50 ? "amber" : "rose";
  const healthLabel =
    metrics.health >= 75
      ? "HEALTHY"
      : metrics.health >= 50
        ? "NEEDS ATTENTION"
        : "AT RISK";
  const healthNote = !metrics.total
    ? "No tasks in this range yet."
    : `${metrics.completePct}% of tasks complete${
        metrics.overdue ? `, ${metrics.overdue} overdue` : ", none overdue"
      }${metrics.spread > 40 ? "; workload is unevenly spread." : "."}`;

  // Report history comes from the backend: GET /reports/group/:groupId/history
  const loadHistory = async () => {
    if (!groupId) return setArchive([]);
    try {
      const { data } = await api.get(`/reports/group/${groupId}/history`);
      const list = Array.isArray(data)
        ? data
        : (data?.reports ?? data?.history ?? data?.data ?? []);
      setArchive(
        list.map((item) => ({
          id: item._id ?? item.id,
          title: item.title ?? "Contribution report",
          date: reportDate(
            new Date(item.createdAt ?? item.generatedAt ?? Date.now()),
          ),
          by: item.generatedBy?.name ?? item.createdBy?.name ?? "System",
        })),
      );
    } catch (err) {
      //console.error("report history:", err);
      setArchive([]);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // POST /reports/group/:groupId persists a new snapshot
  const generateReport = async () => {
    if (!groupId) return notify("No project selected");
    try {
      await api.post(`/reports/group/${groupId}`, { range });
      await loadHistory();
      notify("Fresh contribution report generated");
    } catch (err) {
      //console.error("generate report:", err);
      notify("Failed to generate report");
    }
  };

  // GET /reports/:reportId -> saved as a JSON file
  const downloadReport = async (report) => {
    try {
      const { data } = await api.get(`/reports/${report.id}`);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-${report.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify(`${report.title} downloaded`);
    } catch (err) {
      // console.error("download report:", err);
      notify("Failed to download report");
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="PROJECT INSIGHTS"
        title="Reports and contributions"
        description="Understand workload balance, delivery health, and each member’s verified impact."
      >
        <LSelect
          label=""
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option>Whole project</option>
          <option>Last 30 days</option>
          <option>This week</option>
        </LSelect>
        <LButton
          kind="secondary"
          onClick={() => {
            notify("Preparing PDF export");
            window.print();
          }}
        >
          <LIcon name="download" /> Export PDF
        </LButton>
        <LButton onClick={generateReport}>
          <LIcon name="chart" /> Generate report
        </LButton>
      </PageTitle>
      <div className="l-report-hero">
        <div>
          <small>PROJECT HEALTH SCORE</small>
          <b>{metrics.health}</b>
          <LBadge tone={healthTone}>{healthLabel}</LBadge>
          <p>{healthNote}</p>
        </div>
        <div className="l-health-ring">
          <span>
            <b>{metrics.completePct}%</b>
            <small>Complete</small>
          </span>
        </div>
        <div className="l-report-kpis">
          <span>
            <b>{metrics.total}</b>
            <small>Total tasks</small>
          </span>
          <span>
            <b>{metrics.evidence}</b>
            <small>Evidence files</small>
          </span>
          <span>
            <b>
              {metrics.hours ? `${Math.round(metrics.hours * 10) / 10}h` : "—"}
            </b>
            <small>Tracked effort</small>
          </span>
          <span>
            <b>{metrics.rating ? `${metrics.rating}/5` : "—"}</b>
            <small>Peer rating</small>
          </span>
        </div>
      </div>
      <div className="l-report-grid">
        <section className="l-card">
          <div className="l-card-head">
            <div>
              <h2>Contribution by member</h2>
              <p>Weighted verified contribution</p>
            </div>
            <LIcon name="more" />
          </div>
          <div className="l-contribution-chart">
            {members.length === 0 && (
              <p className="l-empty-copy">No members in this group yet.</p>
            )}
            {members.map((member) => (
              <div key={member.id}>
                <LAvatar initials={member.initials} />
                <span>
                  <b>{member.name}</b>
                  <small>
                    {member.completed} tasks complete · {member.hours}
                  </small>
                  <LProgress value={member.contribution} />
                </span>
                <strong>{member.contribution}%</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="l-card">
          <div className="l-card-head">
            <div>
              <h2>Task distribution</h2>
              <p>Current workload by status</p>
            </div>
          </div>
          <div className="l-donut">
            <div>
              <span>
                <b>{tasks.length}</b>
                <small>Tasks</small>
              </span>
            </div>
            <ul>
              <li>
                <i className="dot-violet" />
                In progress <b>{metrics.progress}</b>
              </li>
              <li>
                <i className="dot-blue" />
                In review <b>{metrics.review}</b>
              </li>
              <li>
                <i className="dot-green" />
                Complete <b>{metrics.done}</b>
              </li>
              <li>
                <i className="dot-slate" />
                Not started <b>{metrics.notStarted}</b>
              </li>
            </ul>
          </div>
        </section>
      </div>
      <section className="l-card l-report-table">
        <div className="l-card-head">
          <div>
            <h2>Report archive</h2>
            <p>Generated snapshots remain available for audit</p>
          </div>
        </div>
        {archive.length === 0 && (
          <p className="l-empty-copy">
            No reports generated yet. Use “Generate report” to create one.
          </p>
        )}
        {archive.map((report) => (
          <div key={report.id}>
            <span>
              <LIcon name="file" />
            </span>
            <div>
              <b>{report.title}</b>
              <small>
                Generated {report.date} · By {report.by}
              </small>
            </div>
            <LBadge tone="slate">JSON</LBadge>
            <button onClick={() => downloadReport(report)}>
              <LIcon name="download" />
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
