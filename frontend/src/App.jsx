import { lazy, Suspense, useEffect, useState } from "react";
import Auth from "./components/Auth.jsx";
import Landing from "./components/Landing.jsx";
import TwoFactorGate from "./components/TwoFactorGate.jsx";
import { useTask } from "./context/taskContext.jsx";
import { useUser } from "./context/userContext.jsx";
import { useGroup } from "./context/groupContext.jsx";
import api from "./api/axios.js";

const StudentWorkspace = lazy(() => import("./student/StudentWorkspace.jsx"));
const LeaderWorkspace = lazy(() => import("./leader/LeaderWorkspace.jsx"));
const LecturerWorkspace = lazy(
  () => import("./lecturer/LecturerWorkspace.jsx"),
);

function Loader({ role }) {
  return (
    <div className="workspace-loader">
      <span />
      <b>Preparing {role} workspace…</b>
    </div>
  );
}

export default function App() {
  const { setGroups } = useGroup();
  const { setUsers, user, setUser, setLeaders, setStudents } = useUser();
  const { setTasks } = useTask();

  const [screen, setScreen] = useState("landing");
  const [role, setRole] = useState(null);

  const navigate = (next) => {
    setScreen(next);
    window.scrollTo(0, 0);
  };

  const enter = (userOrRole) => {
    const r = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
    setRole(r ?? "member");
    navigate("app");
  };

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      navigate("landing");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        navigate("landing");
        return;
      }
      setRole(parsed.role ?? "member");
      navigate("app");
      getTasks();
      getGroups();
      setUser(parsed);

      getUsers();
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("landing");
    }
  }, []);

  const getTasks = async () => {
    try {
      const response = await api.get("tasks");
      const data =
        response?.data?.tasks ?? response?.data?.data ?? response?.data ?? [];
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      //console.error("getTasks:", error);
    }
  };

  const getUsers = async () => {
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

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("2fa-verified");
    sessionStorage.removeItem("2fa-temp-token");
    setRole(null);
    navigate("landing");
  };

  if (screen === "landing") return <Landing navigate={navigate} />;
  if (screen === "login" || screen === "signup")
    return <Auth mode={screen} navigate={navigate} enter={enter} />;

  if (role === "member")
    return (
      <TwoFactorGate user={user}>
        <Suspense fallback={<Loader role="student" />}>
          <StudentWorkspace logout={logout} />
        </Suspense>
      </TwoFactorGate>
    );

  if (role === "leader")
    return (
      <TwoFactorGate user={user}>
        <Suspense fallback={<Loader role="leader" />}>
          <LeaderWorkspace logout={logout} />
        </Suspense>
      </TwoFactorGate>
    );

  if (role === "lecturer")
    return (
      <TwoFactorGate user={user}>
        <Suspense fallback={<Loader role="lecturer" />}>
          <LecturerWorkspace logout={logout} />
        </Suspense>
      </TwoFactorGate>
    );

  return <Auth mode="login" navigate={navigate} enter={enter} />;
}
