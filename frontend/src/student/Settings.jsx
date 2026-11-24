import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  FormField,
  Icon,
  Modal,
  PageHeader,
} from "../components/AppUI.jsx";
import api from "../api/axios.js";
import { useUser } from "../context/userContext.jsx";

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const errorText = (err, fallback) => err?.response?.data?.message ?? fallback;

export default function SettingsPage({ role, notify }) {
  const { user, setUser } = useUser();
  const [section, setSection] = useState("Profile");
  const [saving, setSaving] = useState(false);

  // ── Profile ──────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");

  // ── Password ─────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── 2FA ──────────────────────────────────────────────────────────
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState("intro");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorQr, setTwoFactorQr] = useState(null);
  const [twoFactorManual, setTwoFactorManual] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  // ── Privacy ──────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState({
    shareContribution: true,
    showActivity: true,
  });

  // ── Notification preferences ─────────────────────────────────────
  const [prefs, setPrefs] = useState({
    task: true,
    submission: true,
    deadline: true,
    group: true,
  });

  // ── Sync from user object ────────────────────────────────────────
  useEffect(() => {
    const [first = "", ...rest] = (user?.name ?? "").split(" ");
    setFirstName(first);
    setLastName(rest.join(" "));
    setDepartment(user?.department ?? "");
    setBio(user?.bio ?? "");
    setPrivacy({
      shareContribution: user?.privacy?.shareContribution ?? true,
      showActivity: user?.privacy?.showActivity ?? true,
    });
    setPrefs({
      task: user?.notificationPreferences?.task ?? true,
      submission: user?.notificationPreferences?.submission ?? true,
      deadline: user?.notificationPreferences?.deadline ?? true,
      group: user?.notificationPreferences?.group ?? true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const roleLabel = useMemo(() => {
    if (user?.role === "lecturer") return "Lecturer";
    if (user?.role === "leader") return "Group leader";
    return "Member";
  }, [user?.role]);

  const persistUser = (updated) => {
    setUser?.(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  };

  // ── Save profile ─────────────────────────────────────────────────
  const saveProfile = async () => {
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return notify("Name cannot be empty");
    setSaving(true);
    try {
      const response = await api.put(`/users/${user._id}`, {
        name,
        department,
        bio,
      });
      const updated = response?.data ?? { ...user, name, department, bio };
      persistUser(updated);
      notify("Profile changes saved");
    } catch (err) {
      notify(errorText(err, "Failed to save profile"));
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────
  const updatePassword = async () => {
    if (newPassword.length < 8)
      return notify("New password must be at least 8 characters");
    if (newPassword !== confirmPassword)
      return notify("New passwords do not match");
    setSaving(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify("Password updated");
    } catch (err) {
      notify(errorText(err, "Failed to update password"));
    } finally {
      setSaving(false);
    }
  };

  // ── 2FA flow ─────────────────────────────────────────────────────
  const openTwoFactor = () => {
    setTwoFactorStep(user?.twoFactorEnabled ? "manage" : "intro");
    setTwoFactorCode("");
    setTwoFactorQr(null);
    setTwoFactorManual("");
    setTwoFactorOpen(true);
  };

  const startTwoFactorSetup = async () => {
    setTwoFactorBusy(true);
    try {
      const response = await api.post("/auth/2fa/start");
      setTwoFactorQr(response?.data?.qrCodeDataUrl ?? null);
      setTwoFactorManual(response?.data?.secret ?? "");
      setTwoFactorStep("verify");
    } catch (err) {
      notify(errorText(err, "Could not start 2FA setup"));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (twoFactorCode.trim().length < 6) {
      notify("Enter the 6-digit code");
      return;
    }
    setTwoFactorBusy(true);
    try {
      await api.post("/auth/2fa/verify", { code: twoFactorCode.trim() });
      setTwoFactorStep("done");
      persistUser({ ...user, twoFactorEnabled: true });
      notify("Two-factor authentication enabled");
    } catch (err) {
      notify(errorText(err, "Invalid verification code"));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    setTwoFactorBusy(true);
    try {
      await api.post("/auth/2fa/disable");
      persistUser({ ...user, twoFactorEnabled: false });
      notify("Two-factor authentication disabled");
      setTwoFactorOpen(false);
    } catch (err) {
      notify(errorText(err, "Could not disable 2FA"));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  // ── Privacy ──────────────────────────────────────────────────────
  const togglePrivacy = (key) =>
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));

  const savePrivacy = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user._id}`, { privacy });
      const updated = response?.data ?? { ...user, privacy };
      persistUser(updated);
      notify("Privacy preferences saved");
    } catch (err) {
      notify(errorText(err, "Failed to save privacy settings"));
    } finally {
      setSaving(false);
    }
  };

  // ── Notifications ────────────────────────────────────────────────
  const togglePref = (key) =>
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await api.put(`/users/${user._id}`, {
        notificationPreferences: prefs,
      });
      const updated = response?.data ?? {
        ...user,
        notificationPreferences: prefs,
      };
      persistUser(updated);
      notify("Notification preferences saved");
    } catch (err) {
      notify(errorText(err, "Failed to save preferences"));
    } finally {
      setSaving(false);
    }
  };

  // ── Export ───────────────────────────────────────────────────────
  const requestExport = async () => {
    try {
      const response = await api.get("/users/me/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `contribu-export-${user?.studentId ?? "data"}.json`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify("Data export downloaded");
    } catch (err) {
      notify(errorText(err, "Could not export data"));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="ACCOUNT"
        title="Settings"
        description="Manage your profile, security, privacy, and notification preferences."
      />

      <div className="settings-layout">
        <aside className="settings-nav">
          {[
            ["Profile", "users"],
            ["Account security", "lock"],
            ["Notifications", "bell"],
            ["Privacy & data", "shield"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={section === label ? "active" : ""}
              onClick={() => setSection(label)}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </aside>

        <section className="card settings-panel">
          {/* ═════════════ PROFILE ═════════════ */}
          {section === "Profile" && (
            <>
              <div className="settings-heading">
                <h2>Personal profile</h2>
                <p>This information is visible to your project teams.</p>
              </div>

              <div className="profile-photo">
                <Avatar initials={initialsOf(user?.name)} />
                <div>
                  <b>{user?.name ?? "—"}</b>
                  <p>
                    {roleLabel} · {user?.email ?? "—"}
                  </p>
                </div>
                <Badge tone={user?.role === "leader" ? "teal" : "slate"}>
                  {roleLabel.toUpperCase()}
                </Badge>
              </div>

              <div className="form-grid">
                <FormField
                  label="First name"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <FormField
                  label="Last name"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <FormField
                  label="Email address"
                  value={user?.email ?? ""}
                  disabled
                  model={1}
                />
                <FormField
                  label="Student ID"
                  value={user?.studentId ?? ""}
                  disabled
                  model={1}
                />
                <FormField
                  label="Department"
                  placeholder="School or department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <label className="form-field">
                <span>Short bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your project teams a little about yourself."
                />
              </label>

              <Button onClick={saveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </Button>
            </>
          )}

          {/* ═════════════ SECURITY ═════════════ */}
          {section === "Account security" && (
            <>
              <div className="settings-heading">
                <h2>Password and security</h2>
                <p>Keep your account protected with a strong password.</p>
              </div>

              <div className="form-stack">
                <FormField
                  label="Current password"
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <FormField
                  label="New password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <FormField
                  label="Confirm new password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                onClick={updatePassword}
                disabled={saving || !currentPassword || !newPassword}
              >
                {saving ? "Updating..." : "Update password"}
              </Button>

              <div className="settings-divider" />

              <div className="setting-row">
                <span>
                  <b>Two-factor authentication</b>
                  <p>
                    {user?.twoFactorEnabled
                      ? "Enabled. A verification code is required on sign-in."
                      : "Add an extra layer of security to your account."}
                  </p>
                </span>
                <Button
                  variant={user?.twoFactorEnabled ? "secondary" : "primary"}
                  onClick={openTwoFactor}
                >
                  {user?.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
                </Button>
              </div>
            </>
          )}

          {/* ═════════════ NOTIFICATIONS ═════════════ */}
          {section === "Notifications" && (
            <>
              <div className="settings-heading">
                <h2>Notification preferences</h2>
                <p>Choose which events reach you.</p>
              </div>

              {[
                ["task", "New task assignments"],
                ["deadline", "Deadline reminders"],
                ["submission", "Review decisions"],
                ["group", "Group announcements"],
              ].map(([key, label]) => (
                <div className="setting-row" key={key}>
                  <span>
                    <b>{label}</b>
                    <p>Show this as an in-app notification.</p>
                  </span>
                  <div className="channel-checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={prefs[key]}
                        onChange={() => togglePref(key)}
                      />
                      In-app
                    </label>
                  </div>
                </div>
              ))}

              <Button onClick={savePreferences} disabled={saving}>
                {saving ? "Saving..." : "Save preferences"}
              </Button>
            </>
          )}

          {/* ═════════════ PRIVACY ═════════════ */}
          {section === "Privacy & data" && (
            <>
              <div className="settings-heading">
                <h2>Privacy and your data</h2>
                <p>Control what teammates see and download your information.</p>
              </div>

              <div className="setting-row">
                <span>
                  <b>Contribution visibility</b>
                  <p>Allow group members to see your completion score.</p>
                </span>
                <input
                  type="checkbox"
                  checked={privacy.shareContribution}
                  onChange={() => togglePrivacy("shareContribution")}
                />
              </div>

              <div className="setting-row">
                <span>
                  <b>Activity status</b>
                  <p>Show your last active time to project leaders.</p>
                </span>
                <input
                  type="checkbox"
                  checked={privacy.showActivity}
                  onChange={() => togglePrivacy("showActivity")}
                />
              </div>

              <Button onClick={savePrivacy} disabled={saving}>
                {saving ? "Saving..." : "Save privacy settings"}
              </Button>

              <div className="settings-divider" />

              <div className="setting-row">
                <span>
                  <b>Download your data</b>
                  <p>
                    Export tasks, evidence metadata, comments, and contribution
                    history.
                  </p>
                </span>
                <Button variant="secondary" onClick={requestExport}>
                  <Icon name="download" /> Request export
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ═════════════ 2FA MODAL ═════════════ */}
      {twoFactorOpen && (
        <Modal
          title="Two-factor authentication"
          subtitle={
            user?.twoFactorEnabled
              ? "Manage your second verification step."
              : "Add a verification code to your sign-in."
          }
          close={() => (twoFactorBusy ? null : setTwoFactorOpen(false))}
          action={
            user?.twoFactorEnabled
              ? "Disable 2FA"
              : twoFactorStep === "intro"
                ? "Start setup"
                : twoFactorStep === "verify"
                  ? "Verify code"
                  : "Done"
          }
          onAction={
            user?.twoFactorEnabled
              ? disableTwoFactor
              : twoFactorStep === "intro"
                ? startTwoFactorSetup
                : twoFactorStep === "verify"
                  ? verifyTwoFactor
                  : () => setTwoFactorOpen(false)
          }
          actionDisabled={
            twoFactorBusy ||
            (twoFactorStep === "verify" && twoFactorCode.trim().length < 6)
          }
        >
          {twoFactorStep === "intro" && !user?.twoFactorEnabled && (
            <>
              <p className="muted">
                You'll scan a QR code with an authenticator app, then enter the
                6-digit code it generates to confirm.
              </p>
              <div className="info-callout">
                <Icon name="shield" />
                <p>
                  Supported apps: Google Authenticator, Microsoft Authenticator,
                  Authy, 1Password.
                </p>
              </div>
            </>
          )}

          {twoFactorStep === "verify" && !user?.twoFactorEnabled && (
            <>
              {twoFactorQr && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <img
                    src={twoFactorQr}
                    alt="QR code"
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 8,
                      background: "#fff",
                      padding: 8,
                    }}
                  />
                </div>
              )}
              {twoFactorManual && (
                <p
                  className="muted"
                  style={{ textAlign: "center", marginBottom: 12 }}
                >
                  Or enter manually:{" "}
                  <code style={{ fontSize: 12 }}>{twoFactorManual}</code>
                </p>
              )}
              <FormField
                label="6-digit code"
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(
                    e.target.value.replace(/\D/g, "").slice(0, 6),
                  )
                }
              />
            </>
          )}

          {twoFactorStep === "done" && (
            <div className="info-callout">
              <Icon name="check" />
              <p>Two-factor authentication is now enabled on your account.</p>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <p className="muted">
              Two-factor is currently active. Disabling it will require only
              your password on the next sign-in.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
