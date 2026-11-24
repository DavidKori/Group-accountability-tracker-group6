import { useCallback, useEffect, useMemo, useState } from "react";
import { LAvatar, LButton, LIcon, LProgress } from "../components/LeaderUI.jsx";
import CommandCenter from "./CommandCenter.jsx";
import TasksPage from "./ProjectTasks.jsx";
import MembersPage from "./TeamMembers.jsx";
import ReviewsPage from "./ReviewQueue.jsx";
import ReportsPage from "./Reports.jsx";
import ProjectSettings from "./ProjectSettings.jsx";
import ProjectsPage from "./Projects.jsx";
import {
  ConfirmModal,
  InviteModal,
  MemberModal,
  ReassignModal,
  ReviewModal,
  SubmitModal,
  TaskModal,
} from "./LeaderModals.jsx";
import { useTask } from "../context/taskContext.jsx";
import { useUser } from "../context/userContext.jsx";
import { useGroup } from "../context/groupContext.jsx";
import { useAssessment } from "../context/assesmentContext.jsx";
import api from "../api/axios.js";
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

// Accepts [..], { key: [..] } or { data: [..] } and always returns an array.
const unwrap = (data, key) => {
  const value = Array.isArray(data)
    ? data
    : (data?.[key] ?? data?.data ?? data?.items);
  return Array.isArray(value) ? value : [];
};

export default function LeaderWorkspace({ logout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobile, setMobile] = useState(false);
  const [toast, setToast] = useState("");
  const [alerts, setAlerts] = useState(0);
  const [memberships, setMemberships] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const { tasks, setTasks } = useTask();
  const { user, students, setUsers, setStudents, setLeaders } = useUser();
  const { groups, setGroups } = useGroup();
  const { answers, setAnswers } = useAssessment();

  // ---- Loaders (the contexts only hold state; they expose no fetchers
  // for groups/tasks, so the workspace loads them from the real routes) ----
  const refreshGroups = async () => {
    try {
      const data = await api.get("/groups");
      //console.log("students", data);
      setGroups(unwrap(data, "groups"));
    } catch (err) {
      //console.error("groups:", err);
    }
  };
  //console.log("groups", groups);
  // Full detail (project, members, subtasks) of one group, merged into state.
  const refreshSelectedGroup = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const { data } = await api.get(`/groups/${id}`);
        const group = data?.group ?? data?.data ?? data;
        if (!group?._id) return;
        setGroups((current) => {
          const list = Array.isArray(current) ? current : [];
          return list.some((g) => String(g._id) === String(group._id))
            ? list.map((g) =>
                String(g._id) === String(group._id) ? { ...g, ...group } : g,
              )
            : [...list, group];
        });
      } catch (err) {
        //console.error("group detail:", err);
      }
    },
    [setGroups],
  );

  const refreshTasks = useCallback(async () => {
    try {
      const { data } = await api.get("/tasks");
      setTasks(unwrap(data, "tasks"));
    } catch (err) {
      //console.error("tasks:", err);
    }
  }, [setTasks]);

  // Assessments -> answers of every assessment, flattened into one list.
  const refreshAnswers = useCallback(async () => {
    try {
      const { data } = await api.get("/assessments");
      const assessments = unwrap(data, "assessments");
      const lists = await Promise.all(
        assessments.map((assessment) =>
          api
            .get(`/assessments/${assessment._id}/answers`)
            .then((res) =>
              unwrap(res.data, "answers").map((answer) => ({
                ...answer,
                assessment:
                  answer.assessment && typeof answer.assessment === "object"
                    ? answer.assessment
                    : { _id: assessment._id, title: assessment.title },
              })),
            )
            .catch(() => []),
        ),
      );
      setAnswers(lists.flat());
    } catch (err) {
      //console.error("answers:", err);
    }
  }, [setAnswers]);

  const reloadGroup = useCallback(
    () => Promise.all([refreshGroups(), refreshSelectedGroup(selectedGroupId)]),
    [refreshGroups, refreshSelectedGroup, selectedGroupId],
  );

  const routes = {
    "Command center": "/leader",
    "Project tasks": "/leader/tasks",
    "Team members": "/leader/team",
    "Review queue": "/leader/reviews",
    Reports: "/leader/reports",
    "Project settings": "/leader/settings",
    Projects: "/leader/projects",
    Notifications: "/leader/notifications",
  };

  const active =
    Object.entries(routes).find(
      ([, path]) =>
        location.pathname === path || location.pathname.startsWith(path + "/"),
    )?.[0] ?? "Command center";

  const pathParts = location.pathname.split("/").filter(Boolean);
  const modal = pathParts[0] === "leader" && pathParts[2] ? pathParts[2] : null;
  const selectedId = pathParts[3] ?? null;

  // Fetch memberships once on mount; default to the first led group.
  useEffect(() => {
    let cancelled = false;
    api
      .get("/users/me/memberships")
      .then(({ data }) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
          : (data?.memberships ?? data?.data ?? []);
        setMemberships(list);
        if (!selectedGroupId && list.length) {
          const preferred = list.find((m) => m.role === "leader") ?? list[0];
          setSelectedGroupId(preferred.groupId);
        }
      })
      .catch((err) => {
        //console.error("memberships:", err)
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshGroups();
    refreshTasks();
    refreshAnswers();
  }, [refreshTasks, refreshAnswers]);

  // Load the user list once so group members given as ids can be resolved.
  useEffect(() => {
    //console.log("students", students);
    if (students?.length) return;
    api
      .get("/users")
      .then(({ data }) => {
        const list = unwrap(data, "users");
        //console.log("users", list);
        setUsers?.(list);
        //console.log("user_s", users);
        setStudents?.(
          list.filter((u) => !["admin", "lecturer"].includes(u.role)),
        );
      })
      .catch((err) => {
        // console.error("users:", err)
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the selected project/group changes, pull its full detail.
  useEffect(() => {
    refreshSelectedGroup(selectedGroupId);
  }, [selectedGroupId, refreshSelectedGroup]);

  // If /users/me/memberships is empty or fails, build the list from the
  // groups the backend already returned so the Projects page never shows empty.
  const allMemberships = useMemo(() => {
    if (memberships.length) return memberships;
    const uid = String(user?._id ?? "");
    if (!uid || !Array.isArray(groups)) return [];
    return groups
      .filter(
        (g) =>
          String(g.leader?._id ?? g.leader) === uid ||
          (g.groupMembers || []).some((m) => String(m._id ?? m) === uid),
      )
      .map((g) => ({
        groupId: g._id,
        groupName: g.name,
        projectId: g.project?._id ?? g.project ?? g.task?._id ?? g.task,
        projectTitle: g.project?.title ?? g.task?.title,
        projectCourse: g.project?.course ?? g.code,
        deadline: g.project?.deadline,
        role: String(g.leader?._id ?? g.leader) === uid ? "leader" : "member",
        memberCount: (g.groupMembers || []).length,
      }));
  }, [memberships, groups, user?._id]);

  // Default selection when only the fallback list is available.
  useEffect(() => {
    if (selectedGroupId || !allMemberships.length) return;
    const preferred =
      allMemberships.find((m) => m.role === "leader") ?? allMemberships[0];
    setSelectedGroupId(preferred.groupId);
  }, [allMemberships, selectedGroupId]);

  // Current membership (used for the sidebar label when group.project is not populated)
  const currentMembership = useMemo(
    () =>
      allMemberships.find(
        (m) => String(m.groupId) === String(selectedGroupId),
      ) ?? null,
    [allMemberships, selectedGroupId],
  );

  // Resolve the selected group from the fetched groups array
  const myGroup = useMemo(() => {
    if (!groups) return null;
    if (selectedGroupId) {
      return (
        groups.find((g) => String(g._id) === String(selectedGroupId)) ?? null
      );
    }
    return null;
  }, [groups, selectedGroupId]);

  // Members for the selected group
  const members = useMemo(() => {
    const ids = myGroup?.groupMembers ?? [];
    return ids
      .map((m) => {
        const member =
          typeof m === "object"
            ? m
            : (students || []).find((s) => String(s._id) === String(m));
        return member ?? null;
      })
      .filter(Boolean);
  }, [myGroup, students]);

  // Group subtasks (embedded on group)
  const groupSubtasks = useMemo(
    () => (Array.isArray(myGroup?.subtasks) ? myGroup.subtasks : []),
    [myGroup],
  );

  // Group-level tasks (from the Task collection, filtered by group)
  const groupTasks = useMemo(() => {
    // Subtasks embedded on the group are the leader's task list.
    if (Array.isArray(myGroup?.subtasks)) return myGroup.subtasks;
    const all = Array.isArray(tasks) ? tasks : [];
    if (!myGroup?._id) return [];
    return all.filter(
      (t) =>
        String(t.group?._id ?? t.group ?? t.assignedTo?._id ?? t.assignedTo) ===
        String(myGroup._id),
    );
  }, [tasks, myGroup]);

  const pendingReviews = useMemo(() => {
    const memberIds = members.map((m) => String(m._id));
    return (answers || []).filter(
      (a) =>
        memberIds.includes(String(a.user?._id ?? a.user)) &&
        a.status === "submitted" &&
        !a.assessedAt,
    );
  }, [answers, members]);

  // Every answer from this group's members, pending or already decided.
  const groupAnswers = useMemo(() => {
    const memberIds = members.map((m) => String(m._id));
    return (answers || []).filter(
      (a) =>
        memberIds.includes(String(a.user?._id ?? a.user)) &&
        ["submitted", "assessed", "changes_requested"].includes(a.status),
    );
  }, [answers, members]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    const pick = (arr) =>
      (arr || []).find((x) => String(x._id ?? x.id) === String(selectedId)) ??
      null;
    switch (modal) {
      case "task":
        return pick(groupTasks);
      case "member":
      case "reassign":
      case "remove":
        return pick(members);
      case "review":
        return pick(groupAnswers);
      default:
        return null;
    }
  }, [modal, selectedId, groupTasks, members, groupAnswers]);

  const modalSection = {
    task: "Project tasks",
    member: "Team members",
    reassign: "Team members",
    remove: "Team members",
    review: "Review queue",
    invite: "Team members",
    submit: "Command center",
    danger: "Project settings",
  };

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const openModal = (name, item = null) => {
    const section = modalSection[name] ?? active;
    const base = `${routes[section]}/${name}`;
    const id = item?._id ?? item?.id ?? null;
    navigate(id ? `${base}/${id}` : base);
  };

  const closeModal = () => {
    const base =
      pathParts[0] === "leader" && pathParts[1]
        ? `/leader/${pathParts[1]}`
        : routes[active];
    navigate(base);
  };

  // Project switcher handler — sets the active group + navigates home
  const switchGroup = (groupId) => {
    setSelectedGroupId(groupId);
    navigate("/leader");
  };

  const overallProgress = groupSubtasks.length
    ? Math.round(
        (groupSubtasks.filter((s) => s.status === "done").length /
          groupSubtasks.length) *
          100,
      )
    : 0;

  const nav = [
    ["Command center", "home"],
    ["Project tasks", "tasks", groupTasks.length],
    ["Team members", "users", members.length],
    ["Review queue", "eye", pendingReviews.length],
    ["Reports", "chart"],
    ["Project settings", "settings"],
  ];

  const initialsOf = (name) =>
    name
      ? name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?";

  return (
    <div className="leader-shell">
      <aside className={`leader-sidebar ${mobile ? "open" : ""}`}>
        <div className="leader-brand">
          <span>
            <LIcon name="check" />
          </span>
          <b>Contribu</b>
          <button onClick={() => setMobile(false)}>
            <LIcon name="close" />
          </button>
        </div>

        {/* CLICKABLE PROJECT SWITCHER */}
        <button
          type="button"
          className="leader-project"
          onClick={() => {
            navigate("/leader/projects");
            setMobile(false);
          }}
          title="Switch project"
        >
          <small>ACTIVE PROJECT</small>
          <b>
            {myGroup?.name ??
              currentMembership?.groupName ??
              "Choose a project"}
          </b>
          <span>
            {myGroup?.project?.title ??
              myGroup?.task?.title ??
              currentMembership?.projectTitle ??
              "—"}
          </span>
          <LProgress value={overallProgress} />
          <LIcon name="chevron-down" size={14} />
        </button>

        <nav>
          {nav.map(([label, icon, count]) => (
            <NavLink
              key={label}
              to={routes[label]}
              onClick={() => setMobile(false)}
              end={label === "Command center"}
              className="l-nav-link"
            >
              {({ isActive }) => (
                <button type="button" className={isActive ? "active" : ""}>
                  <LIcon name={icon} />
                  <span>{label}</span>
                  {count > 0 && <em>{count}</em>}
                </button>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="leader-sidebar-bottom">
          <div>
            <LAvatar initials={initialsOf(user?.name)} />
            <span>
              <b>{user?.name ?? "—"}</b>
              <small>Group leader</small>
            </span>
          </div>
          <button onClick={logout} aria-label="Log out">
            <LIcon name="logout" />
          </button>
        </div>
      </aside>

      {mobile && (
        <button
          className="leader-scrim"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="leader-main">
        <header className="leader-topbar">
          <button className="leader-menu" onClick={() => setMobile(true)}>
            <LIcon name="menu" />
          </button>
          <div className="leader-search">
            <LIcon name="search" size={17} />
            <input placeholder="Search this project..." />
          </div>
          <div className="leader-top-actions">
            <button
              onClick={() => {
                setAlerts(0);
                notify("All notifications marked as read");
              }}
            >
              <LIcon name="bell" />
              {alerts > 0 && <i>{alerts}</i>}
            </button>
            <LButton kind="secondary" onClick={() => openModal("invite")}>
              <LIcon name="plus" /> Invite
            </LButton>
          </div>
        </header>

        <main className="leader-content">
          <Routes>
            <Route index element={<Navigate to="/leader" replace />} />

            <Route
              path="leader"
              element={
                <CommandCenter
                  groupId={selectedGroupId}
                  setActive={(label) => navigate(routes[label])}
                  openModal={openModal}
                />
              }
            />
            <Route
              path="leader/tasks"
              element={
                <TasksPage
                  tasks={groupTasks}
                  members={members}
                  groupId={selectedGroupId}
                  refresh={reloadGroup}
                  openModal={openModal}
                  notify={notify}
                />
              }
            />
            <Route
              path="leader/tasks/:modalName"
              element={
                <TasksPage
                  tasks={groupTasks}
                  members={members}
                  groupId={selectedGroupId}
                  refresh={reloadGroup}
                  openModal={openModal}
                  notify={notify}
                />
              }
            />
            <Route
              path="leader/tasks/:modalName/:id"
              element={
                <TasksPage
                  tasks={groupTasks}
                  members={members}
                  groupId={selectedGroupId}
                  refresh={reloadGroup}
                  openModal={openModal}
                  notify={notify}
                />
              }
            />

            <Route
              path="leader/team"
              element={
                <MembersPage
                  members={members}
                  tasks={groupTasks}
                  openModal={openModal}
                />
              }
            />
            <Route
              path="leader/team/:modalName"
              element={
                <MembersPage
                  members={members}
                  tasks={groupTasks}
                  openModal={openModal}
                />
              }
            />
            <Route
              path="leader/team/:modalName/:id"
              element={
                <MembersPage
                  members={members}
                  tasks={groupTasks}
                  openModal={openModal}
                />
              }
            />

            <Route
              path="leader/reviews"
              element={
                <ReviewsPage reviews={groupAnswers} openModal={openModal} />
              }
            />
            <Route
              path="leader/reviews/:modalName"
              element={
                <ReviewsPage reviews={groupAnswers} openModal={openModal} />
              }
            />
            <Route
              path="leader/reviews/:modalName/:id"
              element={
                <ReviewsPage reviews={groupAnswers} openModal={openModal} />
              }
            />

            <Route
              path="leader/reports"
              element={
                <ReportsPage
                  members={members}
                  tasks={groupTasks}
                  groupId={selectedGroupId}
                  notify={notify}
                />
              }
            />

            <Route
              path="leader/settings"
              element={
                <ProjectSettings
                  notify={notify}
                  openModal={openModal}
                  groupId={selectedGroupId}
                  refresh={reloadGroup}
                />
              }
            />
            <Route
              path="leader/settings/:modalName"
              element={
                <ProjectSettings
                  notify={notify}
                  openModal={openModal}
                  groupId={selectedGroupId}
                  refresh={reloadGroup}
                />
              }
            />

            {/* NEW: Projects page */}
            <Route
              path="leader/projects"
              element={
                <ProjectsPage
                  memberships={allMemberships}
                  selectedGroupId={selectedGroupId}
                  onSelect={(groupId) => {
                    switchGroup(groupId);
                    setMobile(false);
                  }}
                />
              }
            />

            <Route
              path="leader/notifications"
              element={<Navigate to="/leader" replace />}
            />

            <Route
              path="lecturer/*"
              element={<Navigate to="/leader" replace />}
            />
            <Route
              path="student/*"
              element={<Navigate to="/leader" replace />}
            />
            <Route
              path="leader/*"
              element={<Navigate to="/leader" replace />}
            />
          </Routes>
        </main>
      </div>

      {modal === "task" && (
        <TaskModal
          key={selectedId ?? "new"}
          task={selected}
          members={members}
          close={closeModal}
          save={async (taskData) => {
            try {
              const base = `/groups/${myGroup?._id}/subtasks`;
              if (selected?._id) {
                await api.put(`${base}/${selected._id}`, taskData);
                notify("Task updated successfully");
              } else {
                await api.post(base, taskData);
                notify("Task created and member notified");
              }
              await reloadGroup();
              closeModal();
            } catch (err) {
              //console.error("Task save failed:", err);
              notify("Failed to save task");
            }
          }}
        />
      )}

      {modal === "invite" && (
        <InviteModal
          close={closeModal}
          inviteCode={myGroup?.code ?? myGroup?.inviteCode}
          invite={async (memberData) => {
            if (!memberData.userId) {
              notify("No registered student found with that email");
              return;
            }
            try {
              await api.post(`/groups/${myGroup?._id}/members`, {
                userId: memberData.userId,
              });
              await reloadGroup();
              notify("Invitation sent successfully");
              closeModal();
            } catch (err) {
              //console.error("Invite failed:", err);
              notify("Failed to invite member");
            }
          }}
        />
      )}

      {modal === "member" && selected && (
        <MemberModal
          member={selected}
          tasks={groupTasks.filter(
            (t) =>
              String(t.assignee?._id ?? t.assignee) === String(selected._id),
          )}
          close={closeModal}
          reassign={() => {
            closeModal();
            openModal("reassign", selected);
          }}
          remove={() => openModal("remove", selected)}
        />
      )}

      {modal === "reassign" && selected && (
        <ReassignModal
          member={selected}
          members={members}
          tasks={groupTasks}
          close={closeModal}
          save={async (taskId, assigneeId) => {
            try {
              await api.put(`/groups/${myGroup?._id}/subtasks/${taskId}`, {
                assignee: assigneeId,
              });
              await reloadGroup();
              notify("Task assignment changed");
              closeModal();
            } catch (err) {
              //console.error("Reassign failed:", err);
              notify("Failed to reassign task");
            }
          }}
        />
      )}

      {modal === "remove" && selected && (
        <ConfirmModal
          title="Remove team member?"
          message={`${selected.name} will lose access to the project. Their contribution history will remain available in reports.`}
          close={closeModal}
          confirm={async () => {
            try {
              await api.delete(
                `/groups/${myGroup?._id}/members/${selected._id}`,
              );
              await reloadGroup();
              notify("Member removed and their tasks unassigned");
              closeModal();
            } catch (err) {
              //console.error("Remove member failed:", err);
              notify("Failed to remove member");
            }
          }}
        />
      )}

      {modal === "review" && selected && (
        <ReviewModal
          review={selected}
          close={closeModal}
          decide={async (decision, feedback = "") => {
            try {
              const status =
                decision === "Accepted" ? "assessed" : "changes_requested";
              await api.post(
                `/assessments/${selected.assessment?._id ?? selected.assessment}/answers/${selected._id}/assess`,
                {
                  status,
                  feedback,
                  scores: selected.scores ?? [],
                },
              );
              await refreshAnswers();
              notify(
                decision === "Accepted"
                  ? "Work accepted and contribution recorded"
                  : "Revision request sent to member",
              );
              closeModal();
            } catch (err) {
              //console.error("Review decision failed:", err);
              notify("Failed to record decision");
            }
          }}
        />
      )}

      {modal === "submit" && (
        <SubmitModal
          close={closeModal}
          tasks={groupTasks}
          reviews={pendingReviews}
          submit={async (message) => {
            try {
              await api.post(`/groups/${myGroup?._id}/submit`, { message });
              await reloadGroup();
              notify("Project submitted to lecturer successfully");
              closeModal();
            } catch (err) {
              //console.error("Submit failed:", err);
              notify("Failed to submit project");
            }
          }}
        />
      )}

      {modal === "danger" && (
        <ConfirmModal
          title="Archive this project?"
          message="The project will become read-only for all members. Reports and evidence will remain available to the lecturer."
          close={closeModal}
          confirm={async () => {
            try {
              await api.put(`/groups/${myGroup?._id}`, { active: false });
              await reloadGroup();
              notify("Project archived");
              closeModal();
            } catch (err) {
              //console.error("Archive failed:", err);
              notify("Failed to archive project");
            }
          }}
        />
      )}

      {toast && (
        <div className="l-toast">
          <span>
            <LIcon name="check" size={15} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
