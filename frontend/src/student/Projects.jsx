import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Icon,
  Modal,
  PageHeader,
  Progress,
} from "../components/AppUI.jsx";
import { TaskRow } from "./Dashboard.jsx";
import ActivityTimeline from "./ActivityTimeline.jsx";

// Fallback colours for the project marks (cycled by position).
const PROJECT_COLORS = ["blue", "teal", "amber", "indigo"];

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const capitalize = (text) =>
  text ? String(text).charAt(0).toUpperCase() + String(text).slice(1) : "";

export default function ProjectsPage({
  projects,
  tasks,
  openProject,
  openJoin,
}) {
  return (
    <>
      <PageHeader
        eyebrow="MY GROUPS"
        title="My projects"
        description="Open a project to view its brief, team, tasks, files, and activity."
        actions={
          <Button onClick={openJoin}>
            <Icon name="plus" /> Join a project
          </Button>
        }
      />
      <div className="project-grid">
        {projects.map((project, index) => {
          const projectTasks = tasks.filter(
            (task) => String(task.group) === String(project._id),
          );
          return (
            <article className="project-card" key={project.id}>
              <header>
                <span
                  className={`project-mark mark-${project.color ?? PROJECT_COLORS[index % PROJECT_COLORS.length]}`}
                >
                  <Icon name="projects" />
                </span>
                <button>
                  <Icon name="more" />
                </button>
              </header>
              <Badge tone={project.progress > 70 ? "teal" : "amber"}>
                {project.progress > 70 ? "ON TRACK" : "NEEDS FOCUS"}
              </Badge>
              <h2>{project.name}</h2>
              <p>
                {project.code ? `${project.code} · ` : ""}Led by{" "}
                {project.leader?.name ?? "—"}
              </p>
              <div className="project-stats">
                <span>
                  <b>{project.members}</b> Members
                </span>
                <span>
                  <b>{projectTasks.length}</b> My tasks
                </span>
                <span>
                  <b>{project.due}</b> Due
                </span>
              </div>
              <div className="project-progress-label">
                <span>Overall project progress</span>
                <b>{project.progress}%</b>
              </div>
              <Progress
                value={project.progress}
                tone={project.progress > 70 ? "teal" : "amber"}
              />
              <Button variant="secondary" onClick={() => openProject(project)}>
                Open project <Icon name="arrow" />
              </Button>
            </article>
          );
        })}
        {!projects.length && (
          <div className="empty-state">
            <Icon name="projects" size={30} />
            <h3>No projects yet</h3>
            <p>Join a project with an invitation code from your leader.</p>
          </div>
        )}
      </div>
    </>
  );
}

export function ProjectDetail({ project, tasks, close, openTask }) {
  const [tab, setTab] = useState("Overview");
  return (
    <Modal
      title={project.name}
      subtitle={`${project.code ? `${project.code} · ` : ""}Led by ${project.leader?.name ?? "—"}`}
      close={close}
      wide
    >
      <div className="modal-tabs">
        {["Overview", "My tasks", "Team", "Files", "Activity"].map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="project-overview">
          <div className="project-hero">
            <div>
              <Badge>PROJECT BRIEF</Badge>
              <h3>
                {project.project?.description ||
                  project.task ||
                  "Research, design, and deliver a practical evidence-based solution as a collaborative team."}
              </h3>
              <p>
                Your individual work is tracked through accepted tasks,
                submitted evidence, peer collaboration, and approved
                deliverables.
              </p>
            </div>
            <div className="project-ring">
              <b>{project.progress}%</b>
              <span>complete</span>
            </div>
          </div>
          <div className="detail-grid">
            <article>
              <Icon name="calendar" />
              <span>
                <small>Final deadline</small>
                <b>{project.due}</b>
              </span>
            </article>
            <article>
              <Icon name="users" />
              <span>
                <small>Team size</small>
                <b>{project.members} members</b>
              </span>
            </article>
            <article>
              <Icon name="tasks" />
              <span>
                <small>Your workload</small>
                <b>{tasks.length} assigned tasks</b>
              </span>
            </article>
          </div>
        </div>
      )}
      {tab === "My tasks" && (
        <div className="task-list">
          {tasks.length ? (
            tasks.map((task) => (
              <TaskRow task={task} open={() => openTask(task)} key={task.id} />
            ))
          ) : (
            <div className="empty-state">
              <Icon name="tasks" />
              <h3>No tasks assigned yet</h3>
              <p>Your group leader will notify you when work is available.</p>
            </div>
          )}
        </div>
      )}
      {tab === "Team" && (
        <div className="member-list">
          {(project.groupMembers || []).map((person) => {
            const isLeader =
              String(person._id) ===
              String(project.leader?._id ?? project.leader);
            return (
              <div key={person._id}>
                <Avatar
                  initials={initialsOf(person.name)}
                  color={isLeader ? "indigo" : undefined}
                />
                <span>
                  <b>{person.name}</b>
                  <small>
                    {isLeader
                      ? "Group leader"
                      : capitalize(person.role) || "Member"}
                  </small>
                </span>
                <Button
                  variant="ghost"
                  disabled={!person.email}
                  onClick={() => {
                    window.location.href = `mailto:${person.email}`;
                  }}
                >
                  <Icon name="message" /> Message
                </Button>
              </div>
            );
          })}
          {!(project.groupMembers || []).length && (
            <div className="empty-state">
              <Icon name="users" />
              <h3>No team members yet</h3>
            </div>
          )}
        </div>
      )}
      {tab === "Files" && (
        <div className="empty-state">
          <Icon name="file" />
          <h3>No shared files yet</h3>
          <p>Files your group shares for this project will appear here.</p>
        </div>
      )}
      {tab === "Activity" && <ActivityTimeline />}
    </Modal>
  );
}
