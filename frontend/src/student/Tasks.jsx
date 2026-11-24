import { useMemo } from "react";
import {
  Badge,
  Button,
  Icon,
  PageHeader,
  Progress,
} from "../components/AppUI.jsx";

export default function TasksPage({ tasks, filter, setFilter, openTask }) {
  const shown = useMemo(
    () =>
      filter === "All" ? tasks : tasks.filter((task) => task.status === filter),
    [tasks, filter],
  );
  return (
    <>
      <PageHeader
        eyebrow="MY WORK"
        title="Assigned tasks"
        description="Accept assignments, complete work, attach evidence, and submit for review."
        actions={
          <Button variant="secondary">
            <Icon name="calendar" /> Calendar view
          </Button>
        }
      />
      <div className="task-summary">
        <div>
          <b>{tasks.filter((t) => !t.accepted).length}</b>
          <span>Waiting for acceptance</span>
        </div>
        <div>
          <b>{tasks.filter((t) => t.status === "In progress").length}</b>
          <span>In progress</span>
        </div>
        <div>
          <b>{tasks.filter((t) => t.status === "Revision required").length}</b>
          <span>Revision required</span>
        </div>
        <div>
          <b>{tasks.filter((t) => t.status === "In review").length}</b>
          <span>Awaiting review</span>
        </div>
      </div>
      <section className="card">
        <div className="toolbar">
          <div className="filter-tabs">
            {[
              "All",
              "Assigned",
              "In progress",
              "Revision required",
              "In review",
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
          <Button variant="secondary">
            <Icon name="filter" /> Filter
          </Button>
        </div>
        <div className="detailed-task-list">
          {shown.map((task) => (
            <article key={task.id ?? task._id}>
              <div className="task-top">
                <div>
                  <Badge
                    tone={
                      task.priority === "High"
                        ? "rose"
                        : task.priority === "Medium"
                          ? "amber"
                          : "slate"
                    }
                  >
                    {(task.priority ?? "Medium").toUpperCase()} PRIORITY
                  </Badge>
                  <h2>{task.title}</h2>
                  <p>{task.description}</p>
                </div>
                <Badge
                  tone={
                    task.status === "Revision required"
                      ? "rose"
                      : task.status === "In review"
                        ? "blue"
                        : task.status === "Assigned"
                          ? "slate"
                          : task.status === "Completed"
                            ? "teal"
                            : "amber"
                  }
                >
                  {task.status}
                </Badge>
              </div>
              <div className="task-meta">
                <span>
                  <Icon name="projects" size={16} />
                  {task.project}
                  {task.code ? ` · ${task.code}` : ""}
                </span>
                <span>
                  <Icon name="calendar" size={16} />
                  Due {task.due}
                </span>
                <span>
                  <Icon name="file" size={16} />
                  {(task.evidence ?? []).length} evidence files
                </span>
                <span>
                  <Icon name="message" size={16} />
                  {task.comments ?? 0} comments
                </span>
              </div>
              <div className="task-footer">
                <div>
                  <Progress value={task.progress ?? 0} />
                  <b>{task.progress ?? 0}% complete</b>
                </div>
                <Button onClick={() => openTask(task)}>
                  {task.accepted ? "Open task workspace" : "Review assignment"}{" "}
                  <Icon name="arrow" />
                </Button>
              </div>
            </article>
          ))}
        </div>
        {!shown.length && (
          <div className="empty-state">
            <Icon name="check" size={30} />
            <h3>No tasks in this view</h3>
            <p>
              {tasks.length
                ? "You are all caught up."
                : "Your group leader will notify you when work is available."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
