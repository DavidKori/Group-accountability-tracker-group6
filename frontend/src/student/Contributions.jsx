import { useMemo } from "react";
import {
  Badge,
  Button,
  Icon,
  PageHeader,
  Progress,
  StatCard,
} from "../components/AppUI.jsx";
import { useGroup } from "../context/groupContext.jsx";
import { useUser } from "../context/userContext.jsx";

const DONE = ["done", "complete", "completed"];
const ACTIVE = ["in-progress", "in-review", "review", "submitted", "revision"];
// Higher-priority work counts for more of the contribution
const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

const formatDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "—";
};

export default function ContributionsPage({ notify }) {
  const { user } = useUser();
  const { groups } = useGroup();

  // Every subtask assigned to me, across my groups
  const mine = useMemo(
    () =>
      (groups || []).flatMap((group) =>
        (group.subtasks || [])
          .filter(
            (subtask) =>
              String(subtask.assignee?._id ?? subtask.assignee) ===
              String(user?._id),
          )
          .map((subtask) => ({ ...subtask, groupName: group.name })),
      ),
    [groups, user?._id],
  );

  const summary = useMemo(() => {
    const isDone = (t) => DONE.includes(String(t.status).toLowerCase());
    const completed = mine.filter(isDone);
    const inProgress = mine.filter((t) =>
      ACTIVE.includes(String(t.status).toLowerCase()),
    ).length;
    const completion = mine.length
      ? Math.round((completed.length / mine.length) * 100)
      : 0;

    const weightOf = (t) =>
      PRIORITY_WEIGHT[String(t.priority).toLowerCase()] ?? 2;
    const totalWeight = mine.reduce((sum, t) => sum + weightOf(t), 0) || 1;
    const rows = completed
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .map((t) => [
        t.title,
        t.groupName,
        `${(t.evidence ?? t.files ?? []).length} file${(t.evidence ?? t.files ?? []).length === 1 ? "" : "s"}`,
        formatDate(t.completedAt),
        `${Math.round((weightOf(t) / totalWeight) * 100)}%`,
      ]);

    const projects = new Set(mine.map((t) => t.groupName)).size;
    return {
      completed: completed.length,
      inProgress,
      completion,
      rows,
      projects,
    };
  }, [mine]);

  const { completion } = summary;
  const badge =
    completion >= 80
      ? "STRONG CONTRIBUTOR"
      : completion >= 50
        ? "STEADY CONTRIBUTOR"
        : mine.length
          ? "GETTING STARTED"
          : "NO TASKS YET";
  const headline = !mine.length
    ? "No tasks have been assigned to you yet."
    : completion >= 80
      ? "You are delivering your assigned work consistently."
      : completion >= 50
        ? "You are making steady progress on your assigned work."
        : "Your contribution record is just getting started.";

  // Download the summary and history as a CSV file
  const exportReport = () => {
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Overall score", `${completion}%`],
      ["Tasks completed", summary.completed],
      ["Tasks in progress", summary.inProgress],
      [],
      ["Contribution", "Project", "Evidence", "Completed", "Weight"],
      ...summary.rows,
    ];
    const csv = lines.map((row) => row.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-contribution-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    notify("Contribution report exported");
  };

  return (
    <>
      <PageHeader
        eyebrow="VERIFIED RECORD"
        title="My contributions"
        description="A detailed, evidence-backed record of your work across every project."
        actions={
          <Button onClick={exportReport} disabled={!mine.length}>
            <Icon name="download" /> Export my report
          </Button>
        }
      />
      <div className="contribution-summary">
        <div className="score-ring">
          <span>
            <b>{completion}</b>
            <small>Overall score</small>
          </span>
        </div>
        <div>
          <Badge>{badge}</Badge>
          <h2>{headline}</h2>
          <p>
            Based on the tasks assigned to you and completed across your groups.
          </p>
          <div className="score-bars">
            <label>
              Task completion <b>{completion}%</b>
              <Progress value={completion} />
            </label>
            <label>
              Evidence quality <b>—</b>
              <Progress value={0} />
            </label>
            <label>
              Collaboration <b>—</b>
              <Progress value={0} />
            </label>
          </div>
        </div>
      </div>
      <div className="stats-grid three">
        <StatCard
          icon="tasks"
          label="Tasks completed"
          value={summary.completed}
          detail={`Across ${summary.projects} project${summary.projects === 1 ? "" : "s"}`}
          tone="cyan"
        />
        <StatCard
          icon="file"
          label="Evidence approved"
          value="—"
          detail="Evidence review is not tracked yet"
          tone="green"
        />
        <StatCard
          icon="activity"
          label="In progress"
          value={summary.inProgress}
          detail="Open tasks right now"
          tone="blue"
        />
      </div>
      <section className="card">
        <div className="card-header">
          <div>
            <h2>Contribution history</h2>
            <p>Completed tasks, most recent first</p>
          </div>
          <Button variant="secondary">
            <Icon name="filter" /> Filter
          </Button>
        </div>
        <div className="contribution-table">
          <div className="table-head">
            <span>Contribution</span>
            <span>Project</span>
            <span>Evidence</span>
            <span>Completed</span>
            <span>Weight</span>
          </div>
          {summary.rows.map((row, rowIndex) => (
            <div className="table-row" key={rowIndex}>
              {row.map((cell, index) => (
                <span key={index}>{index === 0 ? <b>{cell}</b> : cell}</span>
              ))}
            </div>
          ))}
          {!summary.rows.length && (
            <div className="empty-state">
              <Icon name="check" size={30} />
              <h3>No completed tasks yet</h3>
              <p>Tasks you finish will be recorded here.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
