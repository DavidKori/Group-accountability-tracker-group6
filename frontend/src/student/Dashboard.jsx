import { useMemo } from "react";
import {
  Badge,
  Button,
  Icon,
  PageHeader,
  Progress,
  StatCard,
} from "../components/AppUI.jsx";
import ActivityTimeline from "./ActivityTimeline.jsx";
import { useUser } from "../context/userContext.jsx";

// Fallback colours for the project marks (cycled by position).
const PROJECT_COLORS = ["blue", "teal", "amber", "indigo"];

const greetingFor = (date) => {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard({
  tasks,
  projects,
  openTask,
  openProject,
  setActive,
  openJoin,
  notify,
}) {
  const { user } = useUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const due = tasks.filter(
    (task) => !["In review", "Completed"].includes(task.status),
  );

  // Open tasks, soonest deadline first (undated tasks last)
  const priorityTasks = useMemo(
    () =>
      [...due].sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks],
  );

  const stats = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const needAttention = due.filter((task) => {
      const date = new Date(task.dueDate);
      return (
        task.dueDate && !Number.isNaN(date.getTime()) && date <= endOfToday
      );
    }).length;

    const completed = tasks.filter((t) => t.status === "Completed").length;
    const score = tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : 0;
    const groupAverage = projects.length
      ? Math.round(
          projects.reduce((sum, p) => sum + (p.progress ?? 0), 0) /
            projects.length,
        )
      : 0;
    const courses = new Set(
      projects.map((p) => p.project?.course ?? p.code).filter(Boolean),
    ).size;

    return { needAttention, completed, score, groupAverage, courses };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, projects]);

  // Tasks I completed this week vs last week, per weekday (Mon–Sun)
  const weekly = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 7);

    const days = [0, 0, 0, 0, 0, 0, 0];
    let lastWeek = 0;
    tasks.forEach((task) => {
      const date = new Date(task.completedAt);
      if (!task.completedAt || Number.isNaN(date.getTime())) return;
      if (date >= start) days[(date.getDay() + 6) % 7] += 1;
      else if (date >= previousStart) lastWeek += 1;
    });
    const total = days.reduce((a, b) => a + b, 0);
    const peak = Math.max(...days, 1);
    return { days, total, lastWeek, peak };
  }, [tasks]);

  const weeklyNote = !weekly.total
    ? "No tasks completed yet this week"
    : !weekly.lastWeek
      ? "Up from none last week"
      : weekly.total >= weekly.lastWeek
        ? `${Math.round(((weekly.total - weekly.lastWeek) / weekly.lastWeek) * 100)}% more than last week`
        : `${Math.round(((weekly.lastWeek - weekly.total) / weekly.lastWeek) * 100)}% fewer than last week`;

  return (
    <>
      <PageHeader
        eyebrow="MEMBER WORKSPACE"
        title={`${greetingFor(new Date())}, ${firstName}`}
        description="Your priorities, progress, and contribution record in one place."
        actions={
          <>
            <Button variant="secondary" onClick={openJoin}>
              <Icon name="plus" /> Join project
            </Button>
            <Button onClick={() => setActive("Assigned tasks")}>
              View my tasks <Icon name="arrow" />
            </Button>
          </>
        }
      />
      <div className="stats-grid">
        <StatCard
          icon="tasks"
          label="Tasks due"
          value={due.length}
          detail={
            stats.needAttention
              ? `${stats.needAttention} need attention today`
              : "Nothing due today"
          }
          tone="cyan"
        />
        <StatCard
          icon="check"
          label="Completed"
          value={stats.completed}
          detail={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}`}
          tone="green"
        />
        <StatCard
          icon="chart"
          label="Contribution score"
          value={`${stats.score}%`}
          detail={
            !tasks.length
              ? "No tasks assigned yet"
              : stats.score >= stats.groupAverage
                ? `${stats.score - stats.groupAverage}% above group average`
                : `${stats.groupAverage - stats.score}% below group average`
          }
          tone="blue"
        />
        <StatCard
          icon="projects"
          label="Active projects"
          value={projects.length}
          detail={
            stats.courses
              ? `Across ${stats.courses} course${stats.courses === 1 ? "" : "s"}`
              : "Join a project to get started"
          }
          tone="amber"
        />
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Priority tasks</h2>
              <p>Accept new work and keep current tasks moving</p>
            </div>
            <button
              className="text-button"
              onClick={() => setActive("Assigned tasks")}
            >
              All tasks <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="task-list">
            {priorityTasks.slice(0, 4).map((task) => (
              <TaskRow key={task.id} task={task} open={() => openTask(task)} />
            ))}
            {!priorityTasks.length && (
              <div className="empty-state">
                <Icon name="check" size={30} />
                <h3>No open tasks</h3>
                <p>Your group leader will notify you when work is available.</p>
              </div>
            )}
          </div>
        </section>
        <div className="stack">
          <section className="contribution-card">
            <small>YOUR CONTRIBUTION THIS WEEK</small>
            <h2>
              {weekly.total} task{weekly.total === 1 ? "" : "s"} completed
            </h2>
            <p>{weeklyNote}</p>
            <div className="mini-bars">
              {weekly.days.map((count, index) => (
                <i
                  key={index}
                  style={{
                    height: `${Math.max(8, Math.round((count / weekly.peak) * 100))}%`,
                  }}
                />
              ))}
            </div>
            <div className="day-labels">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={index}>{day}</span>
              ))}
            </div>
          </section>
          <section className="card compact-card">
            <div className="card-header">
              <div>
                <h2>Recent activity</h2>
                <p>Your latest project updates</p>
              </div>
            </div>
            <ActivityTimeline compact />
            <button
              className="wide-text-button"
              onClick={() => setActive("Activity")}
            >
              View complete activity
            </button>
          </section>
        </div>
      </div>
      <section className="card project-strip">
        <div className="card-header">
          <div>
            <h2>My projects</h2>
            <p>Progress across the groups you belong to</p>
          </div>
          <button
            className="text-button"
            onClick={() => setActive("My projects")}
          >
            View all
          </button>
        </div>
        <div className="project-mini-grid">
          {projects.map((project, index) => (
            <article key={project.id}>
              <div className="project-title">
                <span
                  className={`project-mark mark-${project.color ?? PROJECT_COLORS[index % PROJECT_COLORS.length]}`}
                >
                  <Icon name="projects" />
                </span>
                <div>
                  <h3>{project.name}</h3>
                  <small>
                    {project.code ? `${project.code} · ` : ""}Led by{" "}
                    {project.leader?.name ?? "—"}
                  </small>
                </div>
              </div>
              <div className="project-progress-label">
                <span>{project.tasks} tasks</span>
                <b>{project.progress}%</b>
              </div>
              <Progress value={project.progress} />
              <button
                onClick={() =>
                  openProject
                    ? openProject(project)
                    : notify(`${project.name} opened`)
                }
              >
                Open project <Icon name="arrow" size={15} />
              </button>
            </article>
          ))}
          {!projects.length && (
            <div className="empty-state">
              <Icon name="projects" size={30} />
              <h3>No projects yet</h3>
              <p>Join a project with an invitation code from your leader.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function TaskRow({ task, open }) {
  const tone =
    task.status === "Revision required"
      ? "rose"
      : task.status === "In review"
        ? "blue"
        : task.status === "Assigned"
          ? "slate"
          : "amber";
  return (
    <button className="task-row" onClick={open}>
      <span className={`task-check ${task.progress === 100 ? "done" : ""}`}>
        <Icon name="check" size={14} />
      </span>
      <div className="task-row-main">
        <h3>{task.title}</h3>
        <p>
          {task.project} · Due {task.due}
        </p>
        <Progress
          value={task.progress}
          tone={tone === "rose" ? "rose" : "teal"}
        />
      </div>
      <div className="task-row-end">
        <Badge tone={tone}>{task.status}</Badge>
        <span>{task.progress}%</span>
        <Icon name="arrow" size={16} />
      </div>
    </button>
  );
}
