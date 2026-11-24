import { useMemo, useState } from "react";
import { Badge, Button, Icon, PageTitle } from "../components/LecturerUI.jsx";
import { useTask } from "../context/taskContext.jsx";

export default function TasksPage({ open }) {
  const { tasks } = useTask();
  const [view, setView] = useState("All");

  const shown = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    if (view === "All") return list;
    return list.filter((t) => t.status === view);
  }, [tasks, view]);
  // console.log(tasks);
  return (
    <>
      <PageTitle
        eyebrow="ASSESSMENT DESIGN"
        title="Main tasks"
        description="Publish clear briefs, assign group cohorts, and keep assessment requirements consistent."
      >
        <Button onClick={() => open("task")}>
          <Icon name="plus" /> Create main task
        </Button>
      </PageTitle>

      <div className="t-task-summary">
        {[
          [
            "in-progress",
            tasks?.filter((t) => t.status === "in-progress").length ?? 0,
          ],
          ["todo", tasks?.filter((t) => t.status === "todo").length ?? 0],
          ["done", tasks?.filter((t) => t.status === "done").length ?? 0],
        ].map(([label, value]) => (
          <button
            key={label}
            className={view === label ? "active" : ""}
            onClick={() => setView(view === label ? "All" : label)}
          >
            <b>{value}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section className="t-card">
        <div className="t-table-scroll">
          <div className="t-task-table t-table-head">
            <span>Task brief</span>
            <span>Assigned groups</span>
            <span>Deadline</span>
            <span>Submissions</span>
            <span>Status</span>
            <span />
          </div>
          {shown.map((task) => (
            <div className="t-task-table" key={task._id ?? task.id}>
              <span>
                <b>{task.title ?? "Untitled task"}</b>
                <small>
                  {task.course ?? "—"} · {task.rubric ?? "—"}
                </small>
              </span>
              <span>
                <Icon name="users" size={15} /> {task.groups ?? 0} groups
              </span>
              <span>
                <Icon name="calendar" size={15} /> {task.deadline ?? "—"}
              </span>
              <span>
                {task.submitted
                  ? `${task.submitted} of ${task.groups ?? 0}`
                  : "0"}
              </span>
              <span>
                <Badge tone={task.status === "Draft" ? "slate" : "blue"}>
                  {task.status ?? "todo"}
                </Badge>
              </span>
              <span>
                <button
                  onClick={() => open("task", task)}
                  aria-label="Edit task"
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  onClick={() => open("archiveTask", task)}
                  aria-label="Archive task"
                >
                  <Icon name="trash" />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
