import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, Icon } from "../components/LecturerUI.jsx";
import { seedSubmissions } from "./data.js";
import Portfolio from "./Portfolio.jsx";
import GroupsPage from "./Groups.jsx";
import TasksPage from "./MainTasks.jsx";
import SubmissionsPage from "./Submissions.jsx";
import ReportsPage from "./ContributionReports.jsx";
import SettingsPage from "./Settings.jsx";
import StudentsPage from "./pages/Students.jsx";
import NotificationsPage from "./pages/Notifications.jsx";
import {
  AssessmentModal,
  ConfirmModal,
  GroupModal,
  InviteModal,
  StudentModal,
  TaskModal,
} from "./LecturerModals.jsx";
import GroupDetail from "./LecturerModals.jsx"; // adjust if GroupDetail lives elsewhere
import api from "../api/axios.js";
import { useTask } from "../context/taskContext.jsx";
import { useUser } from "../context/userContext.jsx";
import { useGroup } from "../context/groupContext.jsx";
import { useNotification } from "../context/notificationContext.jsx";
import { useModule } from "../context/moduleContext.jsx";
import { getAcademicPeriod } from "../utils/academicPeriod.js";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

export default function LecturerWorkspace({ logout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobile, setMobile] = useState(false);
  const [submissions, setSubmissions] = useState(seedSubmissions);
  const [toast, setToast] = useState("");

  const { groups, setGroups, setLoading } = useGroup();
  const { unreadCount, fetchUnreadCount } = useNotification();
  const { users, user, setUsers, setLeaders, setStudents, students } =
    useUser();
  const { tasks, setTasks, task, setTask, setSelectedTask, taskId } = useTask();
  const { modules, fetchModules } = useModule();

  const routes = {
    Portfolio: "/lecturer",
    Groups: "/lecturer/groups",
    "Main tasks": "/lecturer/tasks",
    Submissions: "/lecturer/submissions",
    Notifications: "/lecturer/notifications",
    "Contribution reports": "/lecturer/reports",
    Settings: "/lecturer/settings",
    Students: "/lecturer/students",
  };

  const active =
    Object.entries(routes).find(
      ([, path]) =>
        location.pathname === path || location.pathname.startsWith(path + "/"),
    )?.[0] ?? "Portfolio";

  // URL shape: /lecturer/<section>/<modal>/<id?>
  const pathParts = location.pathname.split("/").filter(Boolean);
  const modal =
    pathParts[0] === "lecturer" && pathParts[2] ? pathParts[2] : null;
  const selectedId = pathParts[3] ?? null;

  // Look up the selected item from context so refresh survives.
  const selected = useMemo(() => {
    if (!selectedId) return null;
    const pick = (arr) =>
      (arr || []).find((x) => String(x._id ?? x.id) === String(selectedId)) ??
      null;

    switch (modal) {
      case "group":
      case "groupDetail":
      case "archive":
        return pick(groups);
      case "task":
      case "archiveTask":
        return pick(tasks);
      case "student":
        return pick(users);
      case "submission":
        return pick(submissions);
      default:
        return null;
    }
  }, [modal, selectedId, groups, tasks, users, submissions]);

  const modalSection = {
    group: "Groups",
    groupDetail: "Groups",
    archive: "Groups",
    task: "Main tasks",
    archiveTask: "Main tasks",
    submission: "Submissions",
    student: "Students",
    invite: "Settings",
  };

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const open = (name, item = null) => {
    const section = modalSection[name] ?? active;
    const base = `${routes[section]}/${name}`;
    const id = item?._id ?? item?.id ?? null;
    navigate(id ? `${base}/${id}` : base);
  };
  const close = () => {
    const base =
      pathParts[0] === "lecturer" && pathParts[1]
        ? `/lecturer/${pathParts[1]}`
        : routes[active];
    navigate(base);
  };
  // const close = () => {
  //    const base = `${routes[active]}`;
  //    navigate(base);
  //   navigate(routes[active]);
  // };

  useEffect(() => {
    getTasks();
    getUsers();
    getGroups();
    fetchUnreadCount();
    fetchModules();
  }, []);

  const getTasks = async () => {
    try {
      const response = await api.get("projects");
      const data =
        response?.data?.tasks ?? response?.data?.data ?? response?.data ?? [];
      //console.log("data:", response, data);
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      //console.error("getTasks:", error);
    }
  };

  const getUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("users");
      const data =
        response?.data?.data ?? response?.data?.users ?? response?.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
      setLeaders(list.filter((u) => u.role === "leader"));
      setStudents(list.filter((u) => u.role !== "lecturer"));
    } catch (error) {
      //console.error("getUsers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGroups = async () => {
    try {
      const response = await api.get("groups");
      const data =
        response?.data?.groups ?? response?.data?.data ?? response?.data ?? [];
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      //console.error("getGroups:", error);
    }
  };

  const createGroup = async (group) => {
    const response = await api.post("/groups", group);
    return response.data;
  };

  const updateGroup = async (id, group) => {
    const response = await api.put(`/groups/${id}`, group);
    return response.data;
  };

  const deleteGroup = async (id) => {
    const response = await api.delete(`/groups/${id}`);
    return response.data;
  };

  const deleteTask = async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  };

  const period = useMemo(() => getAcademicPeriod(), []);
  const activeModuleCount = useMemo(
    () => (modules || []).filter((m) => m.isActive !== false).length,
    [modules],
  );

  const nav = [
    ["Portfolio", "home"],
    ["Groups", "users", groups?.length || 0],
    ["Main tasks", "tasks", tasks?.length || 0],
    [
      "Submissions",
      "file",
      submissions?.filter((i) => i.status === "Ready to assess").length || 0,
    ],
    ["Notifications", "bell", unreadCount],
    ["Contribution reports", "chart"],
    ["Settings", "settings"],
    ["Students", "users", students?.length || 0],
  ];

  const exportReport = (name = "Portfolio") =>
    notify(`${name} report prepared for export`);

  return (
    <div className="lecturer-shell">
      <aside className={`lecturer-sidebar ${mobile ? "open" : ""}`}>
        <div className="t-brand">
          <span>
            <Icon name="check" />
          </span>
          <b>Contribu</b>
          <button
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="t-term">
          <small>ACADEMIC PERIOD</small>
          <b>{period.label}</b>
          <span>
            {activeModuleCount} active module
            {activeModuleCount === 1 ? "" : "s"}
          </span>
        </div>
        <nav>
          {nav.map(([label, icon, count]) => (
            <NavLink
              key={label}
              to={routes[label]}
              onClick={() => setMobile(false)}
              end={label === "Portfolio"}
              className="t-nav-link"
            >
              {({ isActive }) => (
                <button type="button" className={isActive ? "active" : ""}>
                  <Icon name={icon} />
                  <span>{label}</span>
                  {count > 0 && <em>{count}</em>}
                </button>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="t-sidebar-profile">
          <Avatar
            initials="DR"
            onClick={() => {
              navigate(routes.Settings);
              setMobile(false);
            }}
          />
          <span
            onClick={() => {
              navigate(routes.Settings);
              setMobile(false);
            }}
          >
            <b>{user?.name ?? "—"}</b>
            <small>Lecturer</small>
          </span>

          <button onClick={logout} aria-label="Log out" title="Logout">
            <Icon name="logout" />
          </button>
        </div>
      </aside>

      {mobile && (
        <button
          className="t-scrim"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="lecturer-main">
        <header className="lecturer-topbar">
          <button
            className="t-menu"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>

          <div className="t-welcome">
            <b>Welcome back, {user?.name?.split(" ")[0] ?? "Lecturer"}</b>
            <small>
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </small>
          </div>

          <div className="t-top-actions">
            <button
              className="t-notify"
              title="Notifications"
              onClick={() => {
                navigate(routes.Notifications);
                setMobile(false);
              }}
              aria-label="Notifications"
            >
              <Icon name="bell" />
              {unreadCount > 0 && <i>{unreadCount}</i>}
            </button>
            <Button kind="secondary" onClick={() => open("group")}>
              <Icon name="plus" /> New group
            </Button>
          </div>
        </header>

        <main className="lecturer-content">
          <Routes>
            <Route index element={<Navigate to={routes.Portfolio} replace />} />
            <Route
              path="lecturer"
              element={
                <Portfolio
                  groups={groups}
                  submissions={submissions}
                  setActive={(label) => navigate(routes[label])}
                  open={open}
                  exportReport={exportReport}
                />
              }
            />

            <Route
              path="lecturer/groups"
              element={<GroupsPage groups={groups} open={open} />}
            />
            <Route
              path="lecturer/groups/:modalName"
              element={<GroupsPage groups={groups} open={open} />}
            />
            <Route
              path="lecturer/groups/:modalName/:id"
              element={<GroupsPage groups={groups} open={open} />}
            />

            <Route
              path="lecturer/tasks"
              element={<TasksPage tasks={tasks} open={open} />}
            />
            <Route
              path="lecturer/tasks/:modalName"
              element={<TasksPage tasks={tasks} open={open} />}
            />
            <Route
              path="lecturer/tasks/:modalName/:id"
              element={<TasksPage tasks={tasks} open={open} />}
            />

            <Route
              path="lecturer/submissions"
              element={
                <SubmissionsPage submissions={submissions} open={open} />
              }
            />
            <Route
              path="lecturer/submissions/:modalName"
              element={
                <SubmissionsPage submissions={submissions} open={open} />
              }
            />
            <Route
              path="lecturer/submissions/:modalName/:id"
              element={
                <SubmissionsPage submissions={submissions} open={open} />
              }
            />

            <Route
              path="lecturer/reports"
              element={
                <ReportsPage
                  groups={groups}
                  open={open}
                  exportReport={exportReport}
                />
              }
            />

            <Route
              path="lecturer/settings"
              element={<SettingsPage notify={notify} open={open} />}
            />
            <Route
              path="lecturer/settings/:modalName"
              element={<SettingsPage notify={notify} open={open} />}
            />

            <Route
              path="lecturer/students"
              element={<StudentsPage notify={notify} open={open} />}
            />
            <Route
              path="lecturer/students/:modalName"
              element={<StudentsPage notify={notify} open={open} />}
            />
            <Route
              path="lecturer/students/:modalName/:id"
              element={<StudentsPage notify={notify} open={open} />}
            />

            <Route
              path="lecturer/notifications"
              element={<NotificationsPage notify={notify} open={open} />}
            />
          </Routes>
        </main>
      </div>

      {modal === "group" && (
        <GroupModal
          key={selectedId ?? "new"}
          group={selected}
          mainTaskId={taskId}
          close={close}
          save={async (groupData) => {
            const payload = {
              ...groupData,
              mainTaskId: taskId,
              task: task?.title || "No task",
              due: task?.deadline || "Not set",
            };
            try {
              if (selected?._id) {
                await updateGroup(selected._id, payload);
                notify("Group details updated");
              } else {
                await createGroup(payload);
                notify("Group created and leader notified");
              }
              await getGroups();
              close();
            } catch (error) {
              //console.error("Group save failed:", error);
              notify("Failed to save group");
            }
          }}
        />
      )}

      {modal === "task" && (
        <TaskModal
          key={selectedId ?? "new"}
          task={selected}
          groupCount={groups?.length || 0}
          close={close}
          save={async (savedTask) => {
            if (!savedTask || typeof savedTask !== "object") {
              notify("Invalid task response");
              return;
            }

            const record = {
              ...savedTask,
              status: savedTask.status || "todo",
              submitted: savedTask.submitted ?? 0,
            };

            try {
              if (selected?._id) {
                await api.put(`projects/${selected._id}`, record);
              }
              await getTasks();
              notify(
                selected
                  ? "Main task updated"
                  : "Main task created. Proceed to create groups.",
              );
              close();
              if (!selected) open("group");
            } catch (err) {
              //console.error("Task save failed:", err);
              notify("Failed to save task");
            }
          }}
        />
      )}

      {modal === "groupDetail" && selected && (
        <GroupDetail
          key={selectedId}
          group={selected}
          close={close}
          open={open}
          toggleFlag={async () => {
            try {
              const next = !selected.flagged;
              await api.put(`/groups/${selected._id}`, { flagged: next });
              setGroups((prev) =>
                prev.map((g) =>
                  String(g._id) === String(selected._id)
                    ? { ...g, flagged: next }
                    : g,
                ),
              );
              notify(next ? "Group flagged" : "Flag resolved");
            } catch {
              notify("Failed to update flag");
            }
          }}
        />
      )}

      {modal === "archive" && selected && (
        <ConfirmModal
          title="Archive this group?"
          text={`${selected.name ?? "This group"} will become read-only. Its evidence and assessment records will remain available.`}
          close={close}
          btnName="Group"
          confirm={async () => {
            try {
              await deleteGroup(selected._id);
              setGroups((prev) =>
                prev.filter((g) => String(g._id) !== String(selected._id)),
              );
              notify("Group archived");
              close();
            } catch {
              notify("Failed to archive group");
            }
          }}
        />
      )}

      {modal === "archiveTask" && selected && (
        <ConfirmModal
          title="Archive this task?"
          text={`${selected.title ?? selected.name ?? "This task"} will become read-only. Its evidence and assessment records will remain available.`}
          close={close}
          btnName="Task"
          confirm={async () => {
            try {
              await deleteTask(selected._id);
              setTasks((prev) =>
                prev.filter((t) => String(t._id) !== String(selected._id)),
              );
              notify("Task archived");
              close();
            } catch {
              notify("Failed to archive task");
            }
          }}
        />
      )}

      {modal === "submission" && selected && (
        <AssessmentModal
          key={selectedId}
          submission={selected}
          close={close}
          save={(decision) => {
            setSubmissions((prev) =>
              prev.map((item) =>
                String(item._id ?? item.id) === String(selectedId)
                  ? { ...item, ...decision }
                  : item,
              ),
            );
            close();
            notify(
              decision.status === "Assessed"
                ? "Assessment published to the group"
                : "Change request sent to the group leader",
            );
          }}
        />
      )}

      {modal === "student" && selected && (
        <StudentModal
          key={selectedId}
          student={selected}
          close={close}
          notify={notify}
        />
      )}

      {modal === "invite" && (
        <InviteModal
          close={close}
          notify={(message) => {
            close();
            notify(message);
          }}
        />
      )}

      {toast && (
        <div className="t-toast">
          <span>
            <Icon name="check" size={14} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
