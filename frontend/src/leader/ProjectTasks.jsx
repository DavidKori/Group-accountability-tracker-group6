import { useMemo, useState } from "react";
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

const STATUS_LABELS = {
  todo: "To do",
  "to do": "To do",
  "in-progress": "In progress",
  "in progress": "In progress",
  "in-review": "In review",
  "in review": "In review",
  review: "In review",
  submitted: "In review",
  revision: "Revision",
  changes_requested: "Revision",
  done: "Complete",
  complete: "Complete",
  completed: "Complete",
  unassigned: "Unassigned",
};

const formatDue = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const initialsOf = (name) =>
  name && name !== "No assignee"
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "—";

// Convert a backend task/subtask into the shape this page renders.
const normalizeTask = (task, members) => {
  const assigneeRef = task.assignee;
  const assigneeId = assigneeRef?._id ?? assigneeRef;
  const person =
    typeof assigneeRef === "object" && assigneeRef
      ? assigneeRef
      : (members || []).find((m) => String(m._id) === String(assigneeId));
  const assignee = person?.name ?? "";
  const hasAssignee = Boolean(assigneeId && assignee);
  const rawStatus = String(task.status ?? "todo").toLowerCase();
  let status = STATUS_LABELS[rawStatus] ?? task.status ?? "To do";
  if (!hasAssignee && status === "To do") status = "Unassigned";
  const priority = task.priority
    ? String(task.priority).charAt(0).toUpperCase() +
      String(task.priority).slice(1).toLowerCase()
    : "Medium";
  const progress =
    status === "Complete"
      ? 100
      : Math.min(100, Math.max(0, task.progress ?? 0));
  return {
    ...task,
    id: task._id ?? task.id,
    title: task.title ?? task.name ?? "Untitled task",
    assignee: hasAssignee ? assignee : "No assignee",
    initials: initialsOf(hasAssignee ? assignee : ""),
    due: formatDue(task.dueDate ?? task.deadline ?? task.due),
    priority,
    status,
    progress,
    project:
      (typeof task.project === "object" ? task.project?.title : "") ||
      task.category ||
      "Task",
    comments: Array.isArray(task.comments)
      ? task.comments.length
      : (task.comments ?? 0),
  };
};

export default function TasksPage({
  tasks: rawTasks,
  members,
  groupId,
  refresh,
  openModal,
  notify,
}) {
  const tasks = useMemo(
    () =>
      (Array.isArray(rawTasks) ? rawTasks : []).map((t) =>
        normalizeTask(t, members),
      ),
    [rawTasks, members],
  );
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState("List");
  const filtered =
    filter === "All" ? tasks : tasks.filter((task) => task.status === filter);
  const markDone = async (task) => {
    try {
      const id = task._id ?? task.id;
      // Leaders' tasks are the group's subtasks; /tasks is lecturer-managed.
      const url = groupId
        ? `/groups/${groupId}/subtasks/${id}`
        : `/tasks/${id}`;
      await api.put(url, { status: "done", progress: 100 });
      await refresh?.();
      notify("Task marked complete");
    } catch (err) {
      //console.error("Mark complete failed:", err);
      notify("Failed to mark task complete");
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="PROJECT DELIVERY"
        title="Project tasks"
        description="Create, assign, prioritize, and monitor every project deliverable."
      >
        <LButton
          kind="secondary"
          onClick={() => setView(view === "List" ? "Board" : "List")}
        >
          <LIcon name={view === "List" ? "folder" : "tasks"} />{" "}
          {view === "List" ? "Board view" : "List view"}
        </LButton>
        <LButton onClick={() => openModal("task")}>
          <LIcon name="plus" /> Create task
        </LButton>
      </PageTitle>
      <div className="l-task-metrics">
        {[
          ["All tasks", tasks.length],
          [
            "Unassigned",
            tasks.filter((task) => task.status === "Unassigned").length,
          ],
          [
            "In progress",
            tasks.filter((task) => task.status === "In progress").length,
          ],
          [
            "In review",
            tasks.filter((task) => task.status === "In review").length,
          ],
        ].map(([label, value]) => (
          <button
            key={label}
            onClick={() => setFilter(label === "All tasks" ? "All" : label)}
            className={
              filter === (label === "All tasks" ? "All" : label) ? "active" : ""
            }
          >
            <b>{value}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <section className="l-card">
        <div className="l-toolbar">
          <div className="l-filter-tabs">
            {[
              "All",
              "To do",
              "In progress",
              "In review",
              "Revision",
              "Complete",
            ].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button>
            <LIcon name="filter" size={16} /> More filters
          </button>
        </div>
        {view === "List" ? (
          <div className="l-task-table">
            <div className="l-task-table-head">
              <span>Task</span>
              <span>Assignee</span>
              <span>Due date</span>
              <span>Progress</span>
              <span>Status</span>
              <span />
            </div>
            {filtered.map((task) => (
              <div className="l-task-table-row" key={task.id}>
                <span>
                  <LBadge
                    tone={
                      task.priority === "High"
                        ? "rose"
                        : task.priority === "Medium"
                          ? "amber"
                          : "slate"
                    }
                  >
                    {task.priority}
                  </LBadge>
                  <b>{task.title}</b>
                  <small>
                    {task.project} · {task.comments} comments
                  </small>
                </span>
                <span className="l-assignee">
                  <LAvatar initials={task.initials} />
                  <b>{task.assignee}</b>
                </span>
                <span>
                  <LIcon name="calendar" size={14} />
                  {task.due}
                </span>
                <span>
                  <LProgress value={task.progress} />
                  <small>{task.progress}%</small>
                </span>
                <span>
                  <LBadge
                    tone={
                      task.status === "Revision"
                        ? "rose"
                        : task.status === "In review"
                          ? "blue"
                          : task.status === "Complete"
                            ? "green"
                            : "violet"
                    }
                  >
                    {task.status}
                  </LBadge>
                </span>
                <span className="l-row-actions">
                  <button
                    onClick={() => openModal("task", task)}
                    title="Edit task"
                  >
                    <LIcon name="edit" size={16} />
                  </button>
                  <button onClick={() => markDone(task)} title="Mark complete">
                    <LIcon name="check" size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="l-board">
            {["To do", "In progress", "In review", "Complete"].map((column) => (
              <div key={column}>
                <header>
                  <b>{column}</b>
                  <em>
                    {
                      tasks.filter((task) =>
                        column === "To do"
                          ? ["To do", "Unassigned"].includes(task.status)
                          : task.status === column,
                      ).length
                    }
                  </em>
                </header>
                {tasks
                  .filter((task) =>
                    column === "To do"
                      ? ["To do", "Unassigned"].includes(task.status)
                      : task.status === column,
                  )
                  .map((task) => (
                    <button
                      key={task.id}
                      onClick={() => openModal("task", task)}
                    >
                      <LBadge
                        tone={task.priority === "High" ? "rose" : "slate"}
                      >
                        {task.priority}
                      </LBadge>
                      <h3>{task.title}</h3>
                      <p>
                        <LAvatar initials={task.initials} /> {task.assignee}
                      </p>
                      <small>
                        <LIcon name="calendar" size={13} /> {task.due}
                      </small>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
