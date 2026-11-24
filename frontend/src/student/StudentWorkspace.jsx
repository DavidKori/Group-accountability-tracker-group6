import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast, Workspace } from "../components/AppUI.jsx";
import Dashboard from "./Dashboard.jsx";
import TasksPage from "./Tasks.jsx";
import ProjectsPage, { ProjectDetail } from "./Projects.jsx";
import ActivityPage from "./Activity.jsx";
import ContributionsPage from "./Contributions.jsx";
import NotificationsPage from "./Notifications.jsx";
import Settings from "./Settings.jsx";
import TaskWorkspace from "./TaskWorkspace.jsx";
import JoinProjectModal from "./JoinProjectModal.jsx";
import { useUser } from "../context/userContext.jsx";
import { useGroup } from "../context/groupContext.jsx";
import { useAssessment } from "../context/assesmentContext.jsx";
import { useNotification } from "../context/notificationContext.jsx";
import api from "../api/axios.js";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

const routes = {
  Dashboard: "/student",
  "Assigned tasks": "/student/tasks",
  "My projects": "/student/projects",
  Activity: "/student/activity",
  Contributions: "/student/contributions",
  Notifications: "/student/notifications",
  Settings: "/student/settings",
};

const memberNav = [
  ["Dashboard", "home"],
  ["Assigned tasks", "tasks"],
  ["My projects", "projects"],
  ["Activity", "activity"],
  ["Contributions", "chart"],
  ["Notifications", "bell"],
  ["Settings", "settings"],
];

const modalSection = {
  task: "Assigned tasks",
  project: "My projects",
  join: "My projects",
};

// Subtask status (backend) <-> label shown on the student pages.
const STATUS_LABEL = {
  todo: "Assigned",
  "in-progress": "In progress",
  "in-review": "In review",
  review: "In review",
  submitted: "In review",
  revision: "Revision required",
  changes_requested: "Revision required",
  done: "Completed",
  complete: "Completed",
  completed: "Completed",
};
const LABEL_STATUS = {
  Assigned: "todo",
  "In progress": "in-progress",
  "In review": "in-review",
  "Revision required": "revision",
  Completed: "done",
};

const isDone = (subtask) =>
  ["done", "complete", "completed"].includes(
    String(subtask.status ?? "").toLowerCase(),
  );

const isMine = (subtask, userId) =>
  String(subtask.assignee?._id ?? subtask.assignee) === String(userId);

const formatDue = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const capitalize = (text) =>
  text ? String(text).charAt(0).toUpperCase() + String(text).slice(1) : "";

const evidenceName = (file) =>
  typeof file === "string"
    ? file
    : (file?.originalName ?? file?.name ?? file?.filename ?? "file");

// A group subtask assigned to the current student, in the shape the pages use.
const toStudentTask = (subtask, group) => {
  const raw = String(subtask.status ?? "todo").toLowerCase();
  const status = STATUS_LABEL[raw] ?? "Assigned";
  return {
    ...subtask,
    id: subtask._id,
    group: group._id,
    project: group.name,
    code: group.code ?? "",
    assignedBy: group.leader?.name ?? "",
    title: subtask.title ?? "Untitled task",
    description: subtask.description ?? "",
    priority: capitalize(subtask.priority) || "Medium",
    due: formatDue(subtask.dueDate),
    status,
    accepted: subtask.accepted ?? raw !== "todo",
    progress:
      status === "Completed"
        ? 100
        : Math.min(100, Math.max(0, Number(subtask.progress) || 0)),
    evidence: (subtask.evidence ?? subtask.files ?? []).map(evidenceName),
    comments: Array.isArray(subtask.comments)
      ? subtask.comments.length
      : (subtask.comments ?? 0),
    draft: subtask.draft ?? "",
  };
};

export default function StudentWorkspace({ logout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [toast, setToast] = useState("");
  const [taskFilter, setTaskFilter] = useState("All");

  const { user } = useUser();
  const { groups, setGroups } = useGroup();
  const { answers, fetchAssessments } = useAssessment();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAllRead,
  } = useNotification();
  const routes = {
    Dashboard: "/student",
    "Assigned tasks": "/student/tasks",
    "My projects": "/student/projects",
    Activity: "/student/activity",
    Contributions: "/student/contributions",
    Notifications: "/student/notifications",
    Settings: "/student/settings",
  };
  // GET /groups returns only the groups on this user's own `groups` field,
  // with leader, members, project and embedded subtasks populated.
  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get("/groups");
      const list = Array.isArray(data)
        ? data
        : (data?.groups ?? data?.data ?? []);
      setGroups(Array.isArray(list) ? list : []);
    } catch (err) {
      //console.error("groups:", err);
    }
  }, [setGroups]);

  const active =
    Object.entries(routes).find(
      ([, path]) =>
        location.pathname === path || location.pathname.startsWith(path + "/"),
    )?.[0] ?? "Dashboard";

  const pathParts = location.pathname.split("/").filter(Boolean);
  const modal =
    pathParts[0] === "student" && pathParts[2] ? pathParts[2] : null;
  const selectedId = pathParts[3] ?? null;

  // Resolve the student's group(s)
  const myGroups = useMemo(() => {
    if (!groups || !user?._id) return [];
    return groups.filter((g) =>
      (g.groupMembers || []).some(
        (m) => String(m._id ?? m) === String(user._id),
      ),
    );
  }, [groups, user?._id]);

  // Project = group's project (for the UI, groups and projects are 1:1 here)
  const myProjects = useMemo(
    () =>
      myGroups.map((g) => {
        const subtasks = g.subtasks || [];
        const mine = subtasks.filter((s) => isMine(s, user?._id));
        return {
          _id: g._id,
          id: g._id,
          name: g.name,
          code: g.code ?? g.project?.course ?? "",
          leader: g.leader,
          members: (g.groupMembers || []).length,
          progress: subtasks.length
            ? Math.round(
                (subtasks.filter(isDone).length / subtasks.length) * 100,
              )
            : 0,
          tasks: `${mine.filter(isDone).length} of ${mine.length}`,
          due: formatDue(g.due ?? g.project?.deadline),
          task: g.task,
          project: g.project,
          groupMembers: g.groupMembers,
        };
      }),
    [myGroups, user?._id],
  );

  // Tasks assigned to this student: the group subtasks across their groups
  const myTasks = useMemo(
    () =>
      myGroups.flatMap((g) =>
        (g.subtasks || [])
          .filter((s) => isMine(s, user?._id))
          .map((s) => toStudentTask(s, g)),
      ),
    [myGroups, user?._id],
  );

  // Reviews = answers submitted by this user
  const myReviews = useMemo(
    () =>
      (answers || []).filter(
        (a) => String(a.user?._id ?? a.user) === String(user?._id),
      ),
    [answers, user?._id],
  );

  // The item a modal should display
  const selected = useMemo(() => {
    if (!selectedId) return null;
    const pick = (arr) =>
      (arr || []).find((x) => String(x._id ?? x.id) === String(selectedId)) ??
      null;
    switch (modal) {
      case "task":
        return pick(myTasks);
      case "project":
        return pick(myProjects);
      default:
        return null;
    }
  }, [modal, selectedId, myTasks, myProjects]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const openModal = (name, item = null) => {
    const section = modalSection[name] ?? active;
    const base = `${routes[section]}/${name}`;
    const id = item?._id ?? item?.id ?? null;
    navigate(id ? `${base}/${id}` : base);
  };

  const closeModal = () => {
    const base =
      pathParts[0] === "student" && pathParts[1]
        ? `/student/${pathParts[1]}`
        : routes[active];
    navigate(base);
  };

  useEffect(() => {
    loadGroups();
    fetchAssessments?.();
    fetchNotifications?.();
    fetchUnreadCount?.();
  }, [loadGroups, fetchAssessments, fetchNotifications, fetchUnreadCount]);

  const handleJoinProject = async (project) => {
    try {
      await api.post(`/groups/${project._id}/members`, {
        userId: user._id,
      });
      await loadGroups();
      closeModal();
      notify(`Joined ${project.name}`);
    } catch (err) {
      //console.error("Join failed:", err);
      notify("Failed to join project");
    }
  };

  return (
    <Workspace
      role="member"
      routes={routes}
      nav={memberNav.map((item) =>
        item[0] === "Notifications" ? [...item, unreadCount ?? 0] : item,
      )}
      logout={logout}
    >
      <main className="workspace-content">
        <Routes>
          <Route index element={<Navigate to="/student" replace />} />

          <Route
            path="student"
            element={
              <Dashboard
                tasks={myTasks}
                projects={myProjects}
                openTask={(task) => openModal("task", task)}
                openProject={(project) => openModal("project", project)}
                setActive={(label) => navigate(routes[label])}
                openJoin={() => openModal("join")}
                notify={notify}
              />
            }
          />
          <Route
            path="student/tasks"
            element={
              <TasksPage
                tasks={myTasks}
                filter={taskFilter}
                setFilter={setTaskFilter}
                openTask={(task) => openModal("task", task)}
              />
            }
          />
          <Route
            path="student/tasks/:modalName"
            element={
              <TasksPage
                tasks={myTasks}
                filter={taskFilter}
                setFilter={setTaskFilter}
                openTask={(task) => openModal("task", task)}
              />
            }
          />
          <Route
            path="student/tasks/:modalName/:id"
            element={
              <TasksPage
                tasks={myTasks}
                filter={taskFilter}
                setFilter={setTaskFilter}
                openTask={(task) => openModal("task", task)}
              />
            }
          />

          <Route
            path="student/projects"
            element={
              <ProjectsPage
                projects={myProjects}
                tasks={myTasks}
                openProject={(project) => openModal("project", project)}
                openJoin={() => openModal("join")}
              />
            }
          />
          <Route
            path="student/projects/:modalName"
            element={
              <ProjectsPage
                projects={myProjects}
                tasks={myTasks}
                openProject={(project) => openModal("project", project)}
                openJoin={() => openModal("join")}
              />
            }
          />
          <Route
            path="student/projects/:modalName/:id"
            element={
              <ProjectsPage
                projects={myProjects}
                tasks={myTasks}
                openProject={(project) => openModal("project", project)}
                openJoin={() => openModal("join")}
              />
            }
          />

          <Route path="student/activity" element={<ActivityPage />} />
          <Route
            path="student/contributions"
            element={<ContributionsPage notify={notify} />}
          />
          <Route
            path="student/notifications"
            element={
              <NotificationsPage
                notifications={notifications || []}
                onMarkAllRead={markAllRead}
              />
            }
          />
          <Route
            path="student/settings"
            element={<Settings role="member" notify={notify} />}
          />

          {/* Wrong-role URLs → correct prefix */}
          <Route
            path="lecturer/*"
            element={<Navigate to="/student" replace />}
          />
          <Route path="leader/*" element={<Navigate to="/student" replace />} />
          <Route
            path="student/*"
            element={<Navigate to="/student" replace />}
          />
        </Routes>
      </main>

      {modal === "join" && (
        <JoinProjectModal close={closeModal} join={handleJoinProject} />
      )}

      {modal === "task" && selected && (
        <TaskWorkspace
          key={selectedId}
          task={selected}
          updateTask={async (changed) => {
            try {
              // Students update their own task through the group's subtask route.
              await api.put(
                `/groups/${changed.group}/subtasks/${changed._id}`,
                { status: LABEL_STATUS[changed.status] ?? "in-progress" },
              );
              await loadGroups();
              closeModal();
            } catch (err) {
              //console.error("Task update failed:", err);
              notify("Failed to update task");
            }
          }}
          close={closeModal}
          notify={notify}
        />
      )}

      {modal === "project" && selected && (
        <ProjectDetail
          key={selectedId}
          project={selected}
          tasks={myTasks.filter(
            (task) =>
              String(task.group?._id ?? task.group) === String(selected._id),
          )}
          close={closeModal}
          openTask={(task) => {
            closeModal();
            openModal("task", task);
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </Workspace>
  );
}
