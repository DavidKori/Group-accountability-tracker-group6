import { useMemo, useState } from "react";
import {
  LAvatar,
  LBadge,
  LButton,
  LIcon,
  LProgress,
  LSelect,
  PageTitle,
  Stat,
} from "../components/LeaderUI.jsx";

const DONE_STATUSES = ["done", "complete", "completed"];

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const capitalize = (text) =>
  text ? String(text).charAt(0).toUpperCase() + String(text).slice(1) : "";

// Turn a raw group member (user object) into the shape this page renders,
// with workload numbers computed from the group's real tasks.
const enrichMember = (member, tasks) => {
  const assigned = tasks.filter(
    (task) =>
      String(task.assignee?._id ?? task.assignee) === String(member._id),
  );
  const completed = assigned.filter((task) =>
    DONE_STATUSES.includes(String(task.status).toLowerCase()),
  ).length;
  const contribution = assigned.length
    ? Math.round((completed / assigned.length) * 100)
    : 0;
  const tracked = assigned.reduce(
    (sum, task) => sum + (Number(task.hours ?? task.hoursSpent) || 0),
    0,
  );
  const invited = ["invited", "pending"].includes(
    String(member.status ?? member.inviteStatus ?? "").toLowerCase(),
  );
  return {
    ...member,
    initials: initialsOf(member.name),
    role: capitalize(member.role) || "Member",
    tasks: assigned.length,
    completed,
    contribution,
    hours: tracked ? `${Math.round(tracked * 10) / 10}h` : "—",
    status: invited
      ? "Invited"
      : assigned.length > 0 && contribution < 30
        ? "Needs support"
        : "Active",
  };
};

export default function MembersPage({
  members: rawMembers,
  tasks: rawTasks,
  openModal,
}) {
  const [query, setQuery] = useState("");
  const tasks = Array.isArray(rawTasks) ? rawTasks : [];
  const members = useMemo(
    () => (rawMembers || []).map((member) => enrichMember(member, tasks)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawMembers, rawTasks],
  );
  const shown = members.filter((member) =>
    (member.name ?? "").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="TEAM MANAGEMENT"
        title="Team members"
        description="Balance workloads, support participation, and manage project access."
      >
        <LButton onClick={() => openModal("invite")}>
          <LIcon name="plus" /> Invite members
        </LButton>
      </PageTitle>
      <div className="l-member-summary">
        <div>
          <span className="tone-green">
            <LIcon name="users" />
          </span>
          <b>{members.length}</b>
          <small>Active members</small>
        </div>
        <div>
          <span className="tone-blue">
            <LIcon name="tasks" />
          </span>
          <b>{tasks.length}</b>
          <small>Assigned tasks</small>
        </div>
        <div>
          <span className="tone-amber">
            <LIcon name="alert" />
          </span>
          <b>
            {
              members.filter((member) => member.status === "Needs support")
                .length
            }
          </b>
          <small>Needs support</small>
        </div>
      </div>
      <section className="l-card">
        <div className="l-member-toolbar">
          <div>
            <LIcon name="search" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team members..."
            />
          </div>
          <LButton kind="secondary">
            <LIcon name="download" /> Export roster
          </LButton>
        </div>
        <div className="l-member-grid">
          {shown.map((member) => (
            <article key={member._id}>
              <header>
                <LAvatar initials={member.initials} />
                <LBadge
                  tone={
                    member.status === "Needs support"
                      ? "rose"
                      : member.status === "Invited"
                        ? "amber"
                        : "green"
                  }
                >
                  {member.status}
                </LBadge>
              </header>
              <h2>{member.name}</h2>
              <p>{member.role}</p>
              <a href={`mailto:${member.email}`}>{member.email}</a>
              <div className="l-member-numbers">
                <span>
                  <b>{member.tasks}</b>
                  <small>Tasks</small>
                </span>
                <span>
                  <b>{member.completed}</b>
                  <small>Complete</small>
                </span>
                <span>
                  <b>{member.hours}</b>
                  <small>Tracked</small>
                </span>
              </div>
              <div className="l-contribution-line">
                <span>
                  Contribution score <b>{member.contribution}%</b>
                </span>
                <LProgress value={member.contribution} />
              </div>
              <LButton
                kind="secondary"
                onClick={() => openModal("member", member)}
              >
                Manage member <LIcon name="arrow" size={15} />
              </LButton>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
