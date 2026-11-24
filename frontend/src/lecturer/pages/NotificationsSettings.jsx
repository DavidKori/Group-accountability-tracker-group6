import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Icon,
  SettingsHead,
} from "../../components/LecturerUI.jsx";
import { useNotification } from "../../context/notificationContext.jsx";
import { useUser } from "../../context/userContext.jsx";

const EVENTS = [
  { key: "new_submission", label: "New final submission", recommended: true },
  {
    key: "contribution_imbalance",
    label: "Contribution imbalance detected",
    recommended: true,
  },
  { key: "deadline_missed", label: "Deadline missed", recommended: true },
  { key: "leader_message", label: "Group leader message", recommended: false },
  {
    key: "weekly_digest",
    label: "Weekly portfolio digest",
    recommended: false,
  },
];

const storageKey = (userId) => `notification-prefs:${userId ?? "anon"}`;

const defaultPrefs = () => ({
  inApp: {
    new_submission: true,
    contribution_imbalance: true,
    deadline_missed: true,
    leader_message: true,
    weekly_digest: true,
  },
  email: {
    new_submission: true,
    contribution_imbalance: true,
    deadline_missed: true,
    leader_message: false,
    weekly_digest: true,
  },
});

const readPrefs = (userId) => {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw);
    return {
      inApp: { ...defaultPrefs().inApp, ...(parsed.inApp ?? {}) },
      email: { ...defaultPrefs().email, ...(parsed.email ?? {}) },
    };
  } catch {
    return defaultPrefs();
  }
};

const writePrefs = (userId, prefs) => {
  localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
};

export default function NotificationsSettings({ notify }) {
  const {
    unreadCount,
    fetchUnreadCount,
    markAllRead,
    notifications,
    fetchNotifications,
    deleteNotification,
    markRead,
  } = useNotification();

  const { user } = useUser();

  const [prefs, setPrefs] = useState(defaultPrefs());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs(user?._id));
    fetchUnreadCount();
    fetchNotifications({ limit: 10 });
  }, [user?._id, fetchUnreadCount, fetchNotifications]);

  const toggle = (channel, key) => {
    setPrefs((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: !prev[channel][key],
      },
    }));
  };

  const handleSave = () => {
    setSaving(true);
    writePrefs(user?._id, prefs);
    setSaving(false);
    notify?.("Notification preferences saved");
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      notify?.("All notifications marked as read");
    } catch {
      notify?.("Failed to mark notifications as read");
    }
  };

  return (
    <>
      <SettingsHead
        title="Notification preferences"
        text="Choose the events that need your attention."
      />

      <div className="t-notification-summary">
        <span>
          <Icon name="bell" />
          <b>{unreadCount}</b> unread notification
          {unreadCount === 1 ? "" : "s"}
        </span>
        {unreadCount > 0 && (
          <Button kind="secondary" onClick={handleMarkAll}>
            <Icon name="check" /> Mark all read
          </Button>
        )}
      </div>

      <h4 className="t-section-label">Event preferences</h4>

      {EVENTS.map((event) => (
        <div className="t-setting-row" key={event.key}>
          <span>
            <b>{event.label}</b>
            <small>
              {event.recommended
                ? "Recommended for timely assessment."
                : "General portfolio update."}
            </small>
          </span>
          <label className="t-channel">
            <input
              type="checkbox"
              checked={prefs.inApp[event.key]}
              onChange={() => toggle("inApp", event.key)}
            />
            In-app
          </label>
          <label className="t-channel">
            <input
              type="checkbox"
              checked={prefs.email[event.key]}
              onChange={() => toggle("email", event.key)}
            />
            Email
          </label>
        </div>
      ))}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save preferences"}
      </Button>

      <h4 className="t-section-label">Recent notifications</h4>

      {notifications.length === 0 ? (
        <p className="t-member-empty">No notifications yet.</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n._id}
            className={`t-setting-row ${n.read ? "" : "unread"}`}
          >
            <span>
              <b>{n.title || n.type}</b>
              <small>{n.message}</small>
            </span>
            {!n.read && <Badge tone="amber">NEW</Badge>}
            {!n.read && (
              <button onClick={() => markRead(n._id)} aria-label="Mark as read">
                <Icon name="check" />
              </button>
            )}
            <button
              onClick={() => deleteNotification(n._id)}
              aria-label="Delete notification"
            >
              <Icon name="trash" />
            </button>
          </div>
        ))
      )}
    </>
  );
}
