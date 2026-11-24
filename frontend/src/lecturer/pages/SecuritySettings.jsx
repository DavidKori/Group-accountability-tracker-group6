import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Icon,
  Modal,
  SettingsHead,
} from "../../components/LecturerUI.jsx";
import api from "../../api/axios.js";

const errorText = (err, fallback) => err?.response?.data?.message ?? fallback;

export default function SecuritySettings({ notify, user, setUser }) {
  // ── Password change ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  // ── Activity log ─────────────────────────────────────────────────
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // ── 2FA ──────────────────────────────────────────────────────────
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState("intro");
  const [twoFactorQr, setTwoFactorQr] = useState(null);
  const [twoFactorManual, setTwoFactorManual] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const persistUser = (updated) => {
    setUser?.(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const response = await api.get("/users/me/activity");
      const data = response?.data ?? [];
      setActivity(Array.isArray(data) ? data : []);
    } catch (err) {
      //console.error("activity:", err);
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Password ─────────────────────────────────────────────────────
  const updatePassword = async () => {
    if (newPassword.length < 8)
      return notify?.("New password must be at least 8 characters");
    if (newPassword !== confirmPassword)
      return notify?.("New passwords do not match");

    setPasswordBusy(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      notify?.("Password updated");
      loadActivity();
    } catch (err) {
      notify?.(errorText(err, "Failed to update password"));
    } finally {
      setPasswordBusy(false);
    }
  };

  // ── 2FA flow ─────────────────────────────────────────────────────
  const openTwoFactor = () => {
    setTwoFactorStep(user?.twoFactorEnabled ? "manage" : "intro");
    setTwoFactorQr(null);
    setTwoFactorManual("");
    setTwoFactorCode("");
    setTwoFactorOpen(true);
  };

  const startTwoFactor = async () => {
    setTwoFactorBusy(true);
    try {
      const response = await api.post("/auth/2fa/start");
      setTwoFactorQr(response?.data?.qrCodeDataUrl ?? null);
      setTwoFactorManual(response?.data?.secret ?? "");
      setTwoFactorStep("verify");
    } catch (err) {
      notify?.(errorText(err, "Could not start 2FA setup"));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const verifyTwoFactor = async () => {
    if (twoFactorCode.trim().length < 6)
      return notify?.("Enter the 6-digit code");
    setTwoFactorBusy(true);
    try {
      await api.post("/auth/2fa/verify", { code: twoFactorCode.trim() });
      setTwoFactorStep("done");
      persistUser({ ...user, twoFactorEnabled: true });
      notify?.("Two-factor authentication enabled");
      loadActivity();
    } catch (err) {
      notify?.(errorText(err, "Invalid verification code"));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const disableTwoFactor = async () => {
    setTwoFactorBusy(true);
    try {
      await api.post("/auth/2fa/disable");
      persistUser({ ...user, twoFactorEnabled: false });
      notify?.("Two-factor authentication disabled");
      loadActivity();
      setTwoFactorOpen(false);
    } catch (err) {
      notify?.(errorText(err, "Could not disable 2FA"));
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const formatActivity = (entry) => {
    const label =
      {
        login: "Signed in",
        login_2fa: "Signed in (2FA)",
        login_2fa_live: "Verified session",
        password_change: "Password changed",
        "2fa_enabled": "Two-factor enabled",
        "2fa_disabled": "Two-factor disabled",
      }[entry.action] ?? entry.action;
    const when = entry.at
      ? new Date(entry.at).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    return { label, when };
  };

  return (
    <>
      <SettingsHead
        title="Security and access"
        text="Protect your account with a strong password and two-factor authentication."
      />

      {/* Password change */}
      <h3 className="t-section-label">Change password</h3>
      <div className="t-form-grid">
        <Field label="Current password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
          />
        </Field>
      </div>
      <Button
        onClick={updatePassword}
        disabled={passwordBusy || !currentPassword || !newPassword}
      >
        <Icon name="check" />
        {passwordBusy ? "Updating..." : "Update password"}
      </Button>

      {/* 2FA */}
      <h3 className="t-section-label">Two-factor authentication</h3>
      <div className="t-setting-row">
        <span>
          <b>
            {user?.twoFactorEnabled
              ? "Two-factor is enabled"
              : "Two-factor is off"}
          </b>
          <small>
            {user?.twoFactorEnabled
              ? "A 6-digit code from your authenticator app is required on sign-in."
              : "Add a second verification step to your sign-in."}
          </small>
        </span>
        <Badge tone={user?.twoFactorEnabled ? "blue" : "slate"}>
          {user?.twoFactorEnabled ? "ENABLED" : "DISABLED"}
        </Badge>
        <Button
          kind={user?.twoFactorEnabled ? "secondary" : "primary"}
          onClick={openTwoFactor}
        >
          {user?.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
        </Button>
      </div>

      {/* Activity */}
      <h3 className="t-section-label">Recent account activity</h3>
      <div style={{ marginBottom: 8 }}>
        <Button
          kind="secondary"
          onClick={loadActivity}
          disabled={activityLoading}
        >
          <Icon name="chart" />
          {activityLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      <div>
        {activity.length === 0 && !activityLoading && (
          <p className="t-empty-copy">No recent activity.</p>
        )}
        {activity.map((entry, index) => {
          const { label, when } = formatActivity(entry);
          return (
            <div
              className="t-setting-row"
              key={`${entry.at}-${index}`}
              style={{ alignItems: "center" }}
            >
              <span>
                <b>{label}</b>
                <small>
                  {when}
                  {entry.ip ? ` · ${entry.ip}` : ""}
                </small>
              </span>
            </div>
          );
        })}
      </div>

      {/* 2FA modal */}
      {twoFactorOpen && (
        <Modal
          title="Two-factor authentication"
          subtitle={
            user?.twoFactorEnabled
              ? "Manage your second verification step."
              : "Add a verification code to your sign-in."
          }
          close={() => (twoFactorBusy ? null : setTwoFactorOpen(false))}
          footer={
            <>
              <Button
                kind="secondary"
                onClick={() => setTwoFactorOpen(false)}
                disabled={twoFactorBusy}
              >
                Close
              </Button>
              <Button
                kind={user?.twoFactorEnabled ? "danger" : "primary"}
                onClick={
                  user?.twoFactorEnabled
                    ? disableTwoFactor
                    : twoFactorStep === "intro"
                      ? startTwoFactor
                      : twoFactorStep === "verify"
                        ? verifyTwoFactor
                        : () => setTwoFactorOpen(false)
                }
                disabled={
                  twoFactorBusy ||
                  (twoFactorStep === "verify" &&
                    twoFactorCode.trim().length < 6)
                }
              >
                {user?.twoFactorEnabled
                  ? twoFactorBusy
                    ? "Disabling..."
                    : "Disable 2FA"
                  : twoFactorStep === "intro"
                    ? twoFactorBusy
                      ? "Starting..."
                      : "Start setup"
                    : twoFactorStep === "verify"
                      ? twoFactorBusy
                        ? "Verifying..."
                        : "Verify code"
                      : "Done"}
              </Button>
            </>
          }
        >
          {twoFactorStep === "intro" && !user?.twoFactorEnabled && (
            <>
              <p className="t-info">
                You'll scan a QR code with an authenticator app, then enter the
                6-digit code it generates to confirm.
              </p>
              <div className="t-info">
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
                    alt="Scan with your authenticator app"
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
                  className="t-info"
                  style={{ justifyContent: "center", textAlign: "center" }}
                >
                  Or enter manually:{" "}
                  <code style={{ fontSize: 12 }}>{twoFactorManual}</code>
                </p>
              )}
              <Field label="6-digit code">
                <input
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="123456"
                  inputMode="numeric"
                />
              </Field>
            </>
          )}

          {twoFactorStep === "done" && (
            <div className="t-info">
              <Icon name="check" />
              <p>Two-factor authentication is now enabled on your account.</p>
            </div>
          )}

          {user?.twoFactorEnabled && (
            <p className="t-info">
              Two-factor is currently active. Disabling it will require only
              your password on the next sign-in.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
