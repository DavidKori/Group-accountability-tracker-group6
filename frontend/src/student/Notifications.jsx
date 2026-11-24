import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Icon, PageHeader } from "../components/AppUI.jsx";
import { useNotification } from "../context/notificationContext.jsx";

const FILTERS = ["All", "Unread", "Tasks", "Reviews", "Groups"];

const isUnread = (n) => n.read === false;

const timeAgo = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const iconFor = (type) =>
  ({
    task: "tasks",
    submission: "edit",
    comment: "message",
    deadline: "calendar",
    invite: "users",
    group: "users",
    general: "bell",
  })[type] ?? "bell";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
  } = useNotification();

  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetchNotifications?.();
    fetchUnreadCount?.();
  }, [fetchNotifications, fetchUnreadCount]);

  const list = Array.isArray(notifications) ? notifications : [];

  const shown = useMemo(
    () =>
      list.filter((n) => {
        if (filter === "Unread") return isUnread(n);
        if (filter === "Tasks") return ["task", "deadline"].includes(n.type);
        if (filter === "Reviews") return n.type === "submission";
        if (filter === "Groups") return n.type === "group";
        return true;
      }),
    [list, filter],
  );

  const hasUnread = useMemo(() => list.some(isUnread), [list]);

  const refresh = () =>
    Promise.all([fetchNotifications?.(), fetchUnreadCount?.()]);

  const handleMarkAll = async () => {
    if (acting) return;
    setActing(true);
    try {
      await markAllRead?.();
      await refresh();
    } catch (err) {
      //console.error("mark all read:", err);
    } finally {
      setActing(false);
    }
  };

  const handleOpen = async (notice) => {
    const id = notice._id;
    if (isUnread(notice) && id && busyId !== id) {
      setBusyId(id);
      try {
        await markRead?.(id);
      } catch (err) {
        //console.error("mark read:", err);
      } finally {
        setBusyId(null);
      }
    }

    if (notice.link) {
      navigate(notice.link);
    }
  };

  const handleDelete = async (notice, event) => {
    event.stopPropagation();
    if (!notice._id) return;
    try {
      await deleteNotification?.(notice._id);
      await refresh();
    } catch (err) {
      // console.error("delete:", err);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="INBOX"
        title="Notifications"
        description="Task assignments, group changes, review decisions, and updates."
        actions={
          <Button
            variant="secondary"
            onClick={handleMarkAll}
            disabled={!hasUnread || acting}
          >
            <Icon name="check" /> {acting ? "Marking…" : "Mark all as read"}
          </Button>
        }
      />

      <div className="notification-layout">
        <section className="card notification-list">
          <div className="toolbar">
            <div className="filter-tabs">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                  {item === "Unread" && unreadCount > 0 && (
                    <span style={{ marginLeft: 6 }}>({unreadCount})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading && list.length === 0 && (
            <div className="empty-state">
              <Icon name="bell" size={30} />
              <h3>Loading notifications…</h3>
            </div>
          )}

          {!loading &&
            shown.map((notice) => (
              <button
                key={notice._id}
                className={`notification-item ${isUnread(notice) ? "unread" : ""}`}
                onClick={() => handleOpen(notice)}
                disabled={busyId === notice._id}
              >
                <span className={`notification-type type-${notice.type}`}>
                  <Icon name={iconFor(notice.type)} />
                </span>
                <div>
                  <h3>{notice.title || notice.type || "Notification"}</h3>
                  <p>{notice.message}</p>
                  <small>{timeAgo(notice.createdAt)}</small>
                </div>
                {isUnread(notice) && <i />}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(notice, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleDelete(notice, e);
                    }
                  }}
                  aria-label="Delete notification"
                  title="Delete"
                  style={{
                    marginLeft: 8,
                    color: "#9aa6ac",
                    background: "transparent",
                    padding: "4px 6px",
                  }}
                >
                  <Icon name="trash" size={14} />
                </span>
              </button>
            ))}

          {!loading && shown.length === 0 && (
            <div className="empty-state">
              <Icon name="bell" size={30} />
              <h3>
                {filter === "Unread"
                  ? "You are all caught up"
                  : "No notifications"}
              </h3>
              <p>
                {filter === "All"
                  ? "Task assignments and project updates will appear here."
                  : "Nothing matches this filter."}
              </p>
            </div>
          )}
        </section>

        <aside className="card notification-preferences">
          <h2>Delivery preferences</h2>
          <p>Choose where important updates reach you.</p>
          {[
            ["Email notifications", true],
            ["Task reminders", true],
            ["Comment replies", true],
            ["Weekly digest", false],
          ].map(([label, checked]) => (
            <label key={label}>
              <span>{label}</span>
              <input type="checkbox" defaultChecked={checked} />
            </label>
          ))}
        </aside>
      </div>
    </>
  );
}
