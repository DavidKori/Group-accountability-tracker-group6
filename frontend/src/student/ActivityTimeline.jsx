import { useMemo } from "react";
import { Icon } from "../components/AppUI.jsx";
import { useGroup } from "../context/groupContext.jsx";
import { useNotification } from "../context/notificationContext.jsx";
import { useUser } from "../context/userContext.jsx";

// Notification type -> icon and colour used by the timeline
const TYPE_STYLE = {
  task: ["tasks", "teal"],
  group: ["users", "blue"],
  invite: ["users", "blue"],
  submission: ["edit", "rose"],
  deadline: ["calendar", "amber"],
  comment: ["message", "amber"],
  general: ["bell", "amber"],
  success: ["check", "green"],
};

// Filter tabs on the Activity page -> which kinds of events they show
const FILTERS = {
  "All activity": () => true,
  "My activity": (event) => event.kind === "mine",
  Feedback: (event) => ["comment", "submission"].includes(event.kind),
  Evidence: (event) => event.kind === "submission",
};

const isToday = (date) => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const stamp = (date) =>
  isToday(date)
    ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

// Every event for this user, newest first:
//  - notifications sent to them (assignments, group additions…)
//  - subtasks they completed (completedAt), across their groups
// `filter` is a tab name from FILTERS; `days` limits how far back to look.
export function useActivityEntries(filter = "All activity", days = 0) {
  const { user } = useUser();
  const { groups } = useGroup();
  const { notifications } = useNotification();

  return useMemo(() => {
    const groupName = (id) =>
      (groups || []).find((g) => String(g._id) === String(id))?.name;
    const events = [];

    (Array.isArray(notifications) ? notifications : []).forEach((item) => {
      const at = new Date(item.createdAt ?? item.at);
      if (Number.isNaN(at.getTime())) return;
      const [icon, tone] = TYPE_STYLE[item.type] ?? ["bell", "amber"];
      const group = groupName(item.meta?.group);
      events.push({
        id: `n-${item._id ?? item.id}`,
        kind: item.type ?? "other",
        icon,
        tone,
        at,
        today: isToday(at),
        title: item.title ?? item.message ?? "Update",
        subtitle: `${group ? `${group} · ` : ""}${stamp(at)}`,
      });
    });

    (groups || []).forEach((group) => {
      (group.subtasks || []).forEach((subtask) => {
        if (
          String(subtask.assignee?._id ?? subtask.assignee) !==
            String(user?._id) ||
          !subtask.completedAt
        )
          return;
        const at = new Date(subtask.completedAt);
        if (Number.isNaN(at.getTime())) return;
        events.push({
          id: `s-${subtask._id}`,
          kind: "mine",
          icon: "check",
          tone: "green",
          at,
          today: isToday(at),
          title: `You completed “${subtask.title}”`,
          subtitle: `${group.name} · ${stamp(at)}`,
        });
      });
    });

    const since = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
    const keep = FILTERS[filter] ?? FILTERS["All activity"];
    return events
      .filter((event) => event.at.getTime() >= since && keep(event))
      .sort((a, b) => b.at - a.at);
  }, [notifications, groups, user?._id, filter, days]);
}

// scope: "today" | "earlier" limits the day range; `second` is the old
// name for scope="earlier". compact shows only the latest three entries.
export default function ActivityTimeline({
  compact = false,
  second = false,
  scope,
  filter = "All activity",
  days = 0,
}) {
  const range = scope ?? (second ? "earlier" : "all");
  const all = useActivityEntries(filter, days);
  const entries = all.filter((event) =>
    range === "today" ? event.today : range === "earlier" ? !event.today : true,
  );
  const shown = entries.slice(0, compact ? 3 : entries.length);

  return (
    <div className={`timeline ${compact ? "timeline-compact" : ""}`}>
      {shown.map((entry) => (
        <div key={entry.id}>
          <span className={`timeline-icon timeline-${entry.tone}`}>
            <Icon name={entry.icon} size={16} />
          </span>
          <div>
            <b>{entry.title}</b>
            <small>{entry.subtitle}</small>
          </div>
          {!compact && (
            <button>
              <Icon name="more" />
            </button>
          )}
        </div>
      ))}
      {!shown.length && (
        <div className="empty-state">
          <Icon name="activity" size={28} />
          <h3>No activity yet</h3>
          <p>Assignments, updates and completed tasks will appear here.</p>
        </div>
      )}
    </div>
  );
}
