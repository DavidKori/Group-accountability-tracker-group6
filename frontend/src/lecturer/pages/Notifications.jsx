import { useMemo, useState, useEffect } from "react";
import {
  Badge,
  Button,
  Icon,
  Modal,
  PageTitle,
} from "../../components/LecturerUI.jsx";
import { useNotification } from "../../context/notificationContext.jsx";
import "../../styles/notifications.css";

const TYPE_ICONS = {
  task: "tasks",
  submission: "file",
  comment: "comment",
  deadline: "calendar",
  invite: "send",
  general: "bell",
  group: "users",
};

const TYPE_LABELS = {
  task: "Task",
  submission: "Submission",
  comment: "Comment",
  deadline: "Deadline",
  invite: "Invite",
  general: "General",
  group: "Group",
};

export default function NotificationsPage({ notify, open }) {
  const {
    notifications,
    unreadCount,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    loading,
  } = useNotification();

  const [filter, setFilter] = useState("all"); // all | unread | read
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");

  // Initial fetch + refetch whenever filters change
  useEffect(() => {
    const query = { limit: pagination.limit || 50 };
    if (filter === "unread") query.unread = "true";
    if (filter === "read") query.read = "true";
    if (typeFilter !== "all") query.type = typeFilter;
    fetchNotifications(query);
    fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, typeFilter]);

  const filtered = useMemo(() => {
    let list = [...notifications];

    if (filter === "unread") list = list.filter((n) => !n.read);
    if (filter === "read") list = list.filter((n) => n.read);
    if (typeFilter !== "all") list = list.filter((n) => n.type === typeFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [notifications, filter, typeFilter, search]);

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      read: notifications.filter((n) => n.read).length,
    }),
    [notifications],
  );

  const handleOpen = async (n) => {
    setSelected(n);
    if (!n.read) {
      try {
        await markRead(n._id);
      } catch (err) {
        // silent — the detail view is still open
      }
    }
  };

  const handleMarkAll = async () => {
    setActing(true);
    setError("");
    try {
      await markAllRead();
      notify?.("All notifications marked as read");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark all as read.");
    } finally {
      setActing(false);
    }
  };

  const handleMarkOne = async (n) => {
    try {
      await markRead(n._id);
      notify?.("Notification marked as read");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark as read.");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setActing(true);
    setError("");
    try {
      await deleteNotification(confirmDelete._id);
      notify?.("Notification deleted");
      if (selected?._id === confirmDelete._id) setSelected(null);
      setConfirmDelete(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete notification.");
    } finally {
      setActing(false);
    }
  };

  const handleClearAll = async () => {
    setActing(true);
    setError("");
    try {
      // No dedicated clear-all route in the controller, so delete one by one
      await Promise.all(notifications.map((n) => deleteNotification(n._id)));
      notify?.("All notifications cleared");
      setConfirmClearAll(false);
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to clear notifications.");
    } finally {
      setActing(false);
    }
  };

  const formatRelative = (iso) => {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs} h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <>
      <PageTitle
        eyebrow="ACTIVITY CENTER"
        title="Notifications"
        description="Stay on top of submissions, deadlines, group updates, and invitations."
      >
        <Button
          kind="secondary"
          onClick={handleMarkAll}
          disabled={acting || unreadCount === 0}
        >
          <Icon name="check" /> Mark all read
        </Button>
        <Button
          kind="danger"
          onClick={() => setConfirmClearAll(true)}
          disabled={acting || notifications.length === 0}
        >
          <Icon name="trash" /> Clear all
        </Button>
      </PageTitle>

      {error && <p className="t-error">{error}</p>}

      {/* Summary tabs */}
      <div className="t-notif-summary">
        {[
          ["all", "All", counts.all],
          ["unread", "Unread", counts.unread],
          ["read", "Read", counts.read],
        ].map(([key, label, count]) => (
          <button
            key={key}
            className={filter === key ? "active" : ""}
            onClick={() => setFilter(key)}
          >
            <b>{count}</b>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section className="t-card t-notif-shell">
        {/* Toolbar */}
        <div className="t-notif-toolbar">
          <label className="t-search">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="t-notif-type"
          >
            <option value="all">All types</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        <div className="t-notif-list">
          {loading && filtered.length === 0 && (
            <p className="t-member-empty">Loading notifications...</p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="t-member-empty">No notifications to show.</p>
          )}

          {filtered.map((n) => (
            <article
              key={n._id}
              className={`t-notif-item ${n.read ? "" : "unread"}`}
              onClick={() => handleOpen(n)}
            >
              <span className="t-notif-icon">
                <Icon name={TYPE_ICONS[n.type] ?? "bell"} size={18} />
              </span>
              <div className="t-notif-body">
                <div className="t-notif-top">
                  <b>{n.title || TYPE_LABELS[n.type] || "Notification"}</b>
                  <small>{formatRelative(n.createdAt)}</small>
                </div>
                <p>{n.message}</p>
                <div className="t-notif-meta">
                  <Badge tone={n.read ? "slate" : "blue"}>
                    {TYPE_LABELS[n.type] ?? "General"}
                  </Badge>
                  {n.meta?.project?.title && (
                    <span>
                      <Icon name="tasks" size={12} /> {n.meta.project.title}
                    </span>
                  )}
                  {n.meta?.group?.name && (
                    <span>
                      <Icon name="users" size={12} /> {n.meta.group.name}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="t-notif-actions"
                onClick={(e) => e.stopPropagation()}
              >
                {!n.read && (
                  <button
                    onClick={() => handleMarkOne(n)}
                    aria-label="Mark as read"
                  >
                    <Icon name="check" size={16} />
                  </button>
                )}
                <button
                  onClick={() => setConfirmDelete(n)}
                  aria-label="Delete notification"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>

        {pagination.total > notifications.length && (
          <div className="t-notif-more">
            <Button
              kind="secondary"
              onClick={() =>
                fetchNotifications({
                  limit: (pagination.limit || 20) + 20,
                  unread: filter === "unread" ? "true" : undefined,
                  read: filter === "read" ? "true" : undefined,
                  type: typeFilter !== "all" ? typeFilter : undefined,
                })
              }
            >
              Load more
            </Button>
          </div>
        )}
      </section>

      {/* Detail modal */}
      {selected && (
        <Modal
          title={selected.title || TYPE_LABELS[selected.type] || "Notification"}
          subtitle={`${TYPE_LABELS[selected.type] ?? "General"} · ${formatRelative(selected.createdAt)}`}
          close={() => setSelected(null)}
          footer={
            <>
              {!selected.read && (
                <Button
                  kind="secondary"
                  onClick={() => handleMarkOne(selected)}
                >
                  <Icon name="check" /> Mark read
                </Button>
              )}
              {selected.link && (
                <Button
                  onClick={() => {
                    setSelected(null);
                    open?.("notificationLink", selected.link);
                    notify?.("Opening linked record");
                  }}
                >
                  <Icon name="arrow" /> Open
                </Button>
              )}
            </>
          }
        >
          <p className="t-notif-detail-message">{selected.message}</p>

          <div className="t-notif-detail-meta">
            {selected.meta?.actor?.name && (
              <span>
                <b>From</b> {selected.meta.actor.name}
              </span>
            )}
            {selected.meta?.project?.title && (
              <span>
                <b>Project</b> {selected.meta.project.title}
              </span>
            )}
            {selected.meta?.group?.name && (
              <span>
                <b>Group</b> {selected.meta.group.name}
              </span>
            )}
            {selected.meta?.leader?.name && (
              <span>
                <b>Leader</b> {selected.meta.leader.name}
              </span>
            )}
            {selected.read && selected.readAt && (
              <span>
                <b>Read</b> {new Date(selected.readAt).toLocaleString()}
              </span>
            )}
            <span>
              <b>Received</b> {new Date(selected.createdAt).toLocaleString()}
            </span>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal
          title="Delete notification"
          subtitle="This will permanently remove this notification."
          close={() => (acting ? null : setConfirmDelete(null))}
          footer={
            <>
              <Button
                kind="secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={acting}
              >
                Cancel
              </Button>
              <Button kind="danger" onClick={handleDelete} disabled={acting}>
                {acting ? "Deleting..." : "Delete"}
              </Button>
            </>
          }
        >
          <div className="t-confirm">
            <span>
              <Icon name="alert" />
            </span>
            <p>
              Delete <b>{confirmDelete.title || "this notification"}</b>?
            </p>
          </div>
        </Modal>
      )}

      {/* Clear-all confirm */}
      {confirmClearAll && (
        <Modal
          title="Clear all notifications"
          subtitle="This will permanently delete every notification."
          close={() => (acting ? null : setConfirmClearAll(false))}
          footer={
            <>
              <Button
                kind="secondary"
                onClick={() => setConfirmClearAll(false)}
                disabled={acting}
              >
                Cancel
              </Button>
              <Button kind="danger" onClick={handleClearAll} disabled={acting}>
                {acting ? "Clearing..." : "Clear all"}
              </Button>
            </>
          }
        >
          <div className="t-confirm">
            <span>
              <Icon name="alert" />
            </span>
            <p>
              You are about to delete <b>{notifications.length}</b> notification
              {notifications.length === 1 ? "" : "s"}. This cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
