import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Icon,
  PageTitle,
  SettingsHead,
} from "../components/LecturerUI.jsx";
import { useUser } from "../context/userContext.jsx";
import api from "../api/axios.js";
import ModulesSettings from "./pages/modulesSettings.jsx";
import AssessmentsSettings from "./pages/AssessmentsSettings.jsx";
import NotificationsSettings from "./pages/NotificationsSettings.jsx";
import SecuritySettings from "./pages/SecuritySettings.jsx";
import "../styles/module.css";
import "../styles/assesments.css";
import "../styles/security.css";

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

export default function SettingsPage({ notify, open }) {
  const { user, setUser } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync profile fields when the user object changes
  useEffect(() => {
    const [first = "", ...rest] = (user?.name ?? "").split(" ");
    setFirstName(first);
    setLastName(rest.join(" "));
    setDepartment(user?.department ?? "");
    setBio(user?.bio ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const roleLabel = useMemo(() => {
    if (user?.role === "lecturer") return "Lecturer";
    if (user?.role === "leader") return "Group leader";
    return "Member";
  }, [user?.role]);

  const buildFullName = () =>
    [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

  const handleSave = async () => {
    setError("");
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    setSaving(true);
    try {
      const response = await api.put(`/users/${user._id}`, {
        name: buildFullName(),
        department: department.trim(),
        bio: bio.trim(),
      });
      const updated =
        response?.data?.user ?? response?.data?.data ?? response?.data ?? null;
      if (updated) {
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
      }
      notify?.("Profile changes saved");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const [tab, setTab] = useState("Profile");
  const tabs = [
    ["Profile", "users"],
    ["Modules", "tasks"],
    ["Assessments", "check"],
    ["Notifications", "bell"],
    ["Security", "shield"],
  ];

  return (
    <>
      <PageTitle
        eyebrow="LECTURER ACCOUNT"
        title="Settings"
        description="Manage your profile, academic defaults, alerts, and security."
      >
        <Button kind="secondary" onClick={() => open("invite")}>
          <Icon name="plus" /> Invite co-lecturer
        </Button>
      </PageTitle>

      <div className="t-settings">
        <nav>
          {tabs.map(([label, icon]) => (
            <button
              key={label}
              className={tab === label ? "active" : ""}
              onClick={() => setTab(label)}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>

        <section className="t-card t-settings-panel">
          {tab === "Profile" && (
            <>
              <SettingsHead
                title="Profile information"
                text="Used on feedback, assessment records, and group communication."
              />

              <div className="t-profile">
                <Avatar initials={initialsOf(user?.name)} />
                <span>
                  <b>{user?.name ?? "—"}</b>
                  <small>
                    {department || "Department not set"} · {roleLabel}
                  </small>
                </span>
                <Badge tone={user?.twoFactorEnabled ? "blue" : "slate"}>
                  {user?.twoFactorEnabled ? "2FA ON" : "2FA OFF"}
                </Badge>
              </div>

              {error && <p className="t-error">{error}</p>}

              <div className="t-form-grid">
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </Field>
                <Field label="Institution email">
                  <input value={user?.email ?? ""} type="email" disabled />
                </Field>
                <Field label="Department">
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="School of Pure & Applied Science"
                  />
                </Field>
              </div>

              <Field label="Professional bio">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Lecturer in responsible technology and sustainable systems."
                />
              </Field>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </Button>
            </>
          )}

          {tab === "Modules" && <ModulesSettings notify={notify} />}

          {tab === "Assessments" && <AssessmentsSettings notify={notify} />}

          {tab === "Notifications" && <NotificationsSettings notify={notify} />}

          {tab === "Security" && (
            <SecuritySettings notify={notify} user={user} setUser={setUser} />
          )}
        </section>
      </div>
    </>
  );
}
