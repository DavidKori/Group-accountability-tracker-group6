import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Icon,
  PageTitle,
  Progress,
} from "../components/LecturerUI.jsx";
import { useUser } from "../context/userContext.jsx";

export default function GroupsPage({ groups, open }) {
  const { students } = useUser();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All groups");

  const shown = useMemo(() => {
    const list = Array.isArray(groups) ? groups : [];
    return list.filter((group) => {
      const name = (group.name ?? "").toLowerCase();
      const matchesQuery = name.includes(query.toLowerCase());
      const matchesFilter = filter === "All groups" || group.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [groups, query, filter]);

  const groupsList = Array.isArray(groups) ? groups : [];

  const leaderName = (group) => {
    if (group.leader && typeof group.leader === "object") {
      return group.leader.name ?? "—";
    }
    const leader = (students || []).find(
      (s) => String(s._id) === String(group.leader),
    );
    return leader?.name ?? "—";
  };

  const leaderInitials = (group) => {
    const name = leaderName(group);
    if (!name || name === "—") return "?";
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <PageTitle
        eyebrow="GROUP ADMINISTRATION"
        title="Student groups"
        description="Create groups, appoint leaders, review access, and monitor each team in context."
      >
        <Button onClick={() => open("group")}>
          <Icon name="plus" /> Create group
        </Button>
      </PageTitle>

      <div className="t-mini-stats">
        <div>
          <b>{groupsList.length}</b>
          <span>Total groups</span>
        </div>
        <div>
          <b>{students?.length ?? 0}</b>
          <span>Students</span>
        </div>
        <div>
          <b>{groupsList.filter((g) => g.flagged).length}</b>
          <span>Flagged groups</span>
        </div>
      </div>

      <section className="t-card">
        <div className="t-toolbar">
          <label>
            <Icon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by group name..."
            />
          </label>
          <div>
            {["All groups", "On track", "Needs review", "At risk"].map(
              (item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="t-group-grid">
          {shown.map((group) => {
            const gid = group._id ?? group.id;
            return (
              <article key={gid}>
                <header>
                  <span className="t-group-mark">
                    {(group.name ?? "??").slice(0, 2).toUpperCase()}
                  </span>
                  <Badge
                    tone={
                      group.status === "At risk"
                        ? "rose"
                        : group.status === "Needs review"
                          ? "amber"
                          : "blue"
                    }
                  >
                    {group.status ?? "On track"}
                  </Badge>
                </header>
                <h2>{group.name ?? "Untitled group"}</h2>
                <p>{group.code ?? "—"}</p>
                <div className="t-leader">
                  <Avatar initials={leaderInitials(group)} />
                  <span>
                    <small>GROUP LEADER</small>
                    <b>{leaderName(group)}</b>
                  </span>
                </div>
                <div className="t-group-numbers">
                  <span>
                    <b>{group.groupMembers?.length ?? 0}</b>
                    <small>Members</small>
                  </span>
                  <span>
                    <b>{group.progress ?? 0}%</b>
                    <small>Progress</small>
                  </span>
                  <span>
                    <b>{group.due ?? "—"}</b>
                    <small>Due</small>
                  </span>
                </div>
                <Progress value={group.progress ?? 0} />
                <footer>
                  <Button
                    kind="secondary"
                    onClick={() => open("groupDetail", group)}
                  >
                    Open group
                  </Button>
                  <button
                    onClick={() => open("group", group)}
                    aria-label="Edit group"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    onClick={() => open("archive", group)}
                    aria-label="Archive group"
                  >
                    <Icon name="trash" />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>

        {shown.length === 0 && (
          <Empty
            title="No groups match this view"
            text="Try another search or status filter."
          />
        )}
      </section>
    </>
  );
}
