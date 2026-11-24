import { useEffect, useMemo } from "react";
import {
  LAvatar,
  LBadge,
  LButton,
  LIcon,
  LProgress,
  PageTitle,
  Stat,
} from "../components/LeaderUI.jsx";
import { useGroup } from "../context/groupContext.jsx";
import { useUser } from "../context/userContext.jsx";
import { useAssessment } from "../context/assesmentContext.jsx";

export default function CommandCenter({ groupId, setActive, openModal }) {
  const { groups, fetchGroups } = useGroup();
  const { user, students } = useUser();
  const { answers, fetchAssessments } = useAssessment?.() ?? {};

  useEffect(() => {
    fetchGroups?.();
    fetchAssessments?.();
  }, [fetchGroups, fetchAssessments]);

  // Prefer the group explicitly passed by the workspace, fall back to
  // the first group where the current user is leader (or a member).
  const myGroup = useMemo(() => {
    const list = Array.isArray(groups) ? groups : [];
    if (!user?._id) return list[0] ?? null;

    if (groupId) {
      const match = list.find((g) => String(g._id) === String(groupId));
      if (match) return match;
    }

    return (
      list.find(
        (g) => String(g.leader?._id ?? g.leader) === String(user._id),
      ) ??
      list.find((g) =>
        (g.groupMembers || []).some(
          (m) => String(m._id ?? m) === String(user._id),
        ),
      ) ??
      null
    );
  }, [groups, groupId, user?._id]);

  // Subtasks are embedded on the group. Use them directly — no tasks fetch.
  const subtasks = useMemo(
    () => (Array.isArray(myGroup?.subtasks) ? myGroup.subtasks : []),
    [myGroup],
  );

  // Backend already computes these; recompute locally only as a fallback.
  const stats = useMemo(() => {
    const total = subtasks.length;
    const done = subtasks.filter((s) => s.status === "done").length;
    const inProgress = subtasks.filter(
      (s) => s.status === "in-progress",
    ).length;
    return {
      total,
      done,
      inProgress,
      todo: total - done - inProgress,
      progress: total ? Math.round((done / total) * 100) : 0,
    };
  }, [subtasks]);

  const members = useMemo(() => {
    const ids = myGroup?.groupMembers ?? [];
    return ids
      .map((m) => {
        const member =
          typeof m === "object"
            ? m
            : (students || []).find((s) => String(s._id) === String(m));
        return member ?? null;
      })
      .filter(Boolean);
  }, [myGroup, students]);

  const initialsOf = (name) =>
    name
      ? name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "?";

  const memberSubtaskStats = (memberId) => {
    const assigned = subtasks.filter(
      (s) => String(s.assignee?._id ?? s.assignee) === String(memberId),
    );
    const done = assigned.filter((s) => s.status === "done").length;
    return {
      total: assigned.length,
      done,
      contribution: assigned.length
        ? Math.round((done / assigned.length) * 100)
        : 0,
    };
  };

  // Reviews for members of this group
  const pendingReviews = useMemo(() => {
    const memberIds = members.map((m) => String(m._id));
    return (answers || []).filter(
      (a) =>
        memberIds.includes(String(a.user?._id ?? a.user)) &&
        a.status === "submitted" &&
        !a.assessedAt,
    );
  }, [answers, members]);

  const groupAnswersCount = useMemo(() => {
    const memberIds = members.map((m) => String(m._id));
    return (answers || []).filter((a) =>
      memberIds.includes(String(a.user?._id ?? a.user)),
    ).length;
  }, [answers, members]);

  // Nearest upcoming subtask deadline
  const nextDeadline = useMemo(() => {
    return subtasks
      .map((s) => s.dueDate)
      .filter(Boolean)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  }, [subtasks]);

  const daysLeft = nextDeadline
    ? Math.max(
        0,
        Math.round(
          (new Date(nextDeadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  const deadlineLabel = nextDeadline
    ? new Date(nextDeadline).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "No deadline set";

  const milestones = [
    ["To do", stats.todo],
    ["In progress", stats.inProgress],
    ["Done", stats.done],
  ];
  const milestoneTotal = Math.max(1, stats.total);

  // Role gate — only the group leader sees the leader-only buttons
  const isLeader =
    myGroup?.myRole === "leader" ||
    String(myGroup?.leader?._id ?? myGroup?.leader) === String(user?._id);

  return (
    <>
      <PageTitle
        eyebrow={`${isLeader ? "GROUP LEADER" : "GROUP MEMBER"} · ${
          myGroup?.project?.course ?? myGroup?.code ?? "No module"
        }`}
        title="Project command center"
        description={
          isLeader
            ? "Coordinate your team, resolve blockers, and prepare the final submission."
            : "Track your group's progress and the work assigned to you."
        }
      >
        {isLeader && (
          <LButton kind="secondary" onClick={() => openModal("invite")}>
            <LIcon name="users" /> Invite member
          </LButton>
        )}
        {isLeader && (
          <LButton onClick={() => openModal("task")}>
            <LIcon name="plus" /> Create task
          </LButton>
        )}
      </PageTitle>

      <div className="l-stats">
        <Stat
          icon="chart"
          label="Overall progress"
          value={`${stats.progress}%`}
          meta={`${stats.total} subtask${stats.total === 1 ? "" : "s"} tracked`}
        />
        <Stat
          icon="tasks"
          label="Tasks completed"
          value={`${stats.done} / ${stats.total}`}
          meta={`${stats.inProgress} in progress`}
          tone="blue"
        />
        <Stat
          icon="eye"
          label="Awaiting review"
          value={pendingReviews.length}
          meta={`${groupAnswersCount} submitted total`}
          tone="amber"
        />
        <Stat
          icon="users"
          label="Team members"
          value={members.length}
          meta={myGroup?.name ?? "No group selected"}
          tone="green"
        />
      </div>

      <div className="l-dashboard-grid">
        <section className="l-card">
          <div className="l-card-head">
            <div>
              <h2>Team workload</h2>
              <p>Contribution and assignment balance</p>
            </div>
            <button onClick={() => setActive("Team members")}>
              {isLeader ? "Manage team" : "View team"}{" "}
              <LIcon name="arrow" size={14} />
            </button>
          </div>
          <div className="l-workload">
            {members.length === 0 && (
              <p className="l-empty-copy">No members in this group yet.</p>
            )}
            {members.slice(0, 5).map((member) => {
              const stat = memberSubtaskStats(member._id);
              const status =
                stat.total === 0 || stat.contribution >= 30
                  ? "On track"
                  : "Needs support";
              return (
                <button
                  key={member._id}
                  onClick={() => openModal("member", member)}
                >
                  <LAvatar initials={initialsOf(member.name)} />
                  <span>
                    <b>{member.name ?? "Unnamed"}</b>
                    <small>
                      {member.role ?? "member"} · {stat.total} task
                      {stat.total === 1 ? "" : "s"}
                    </small>
                  </span>
                  <div>
                    <LProgress value={stat.contribution} />
                    <small>{stat.contribution}%</small>
                  </div>
                  <LBadge tone={status === "Needs support" ? "rose" : "green"}>
                    {status}
                  </LBadge>
                </button>
              );
            })}
          </div>
        </section>

        <section className="l-card">
          <div className="l-card-head">
            <div>
              <h2>Review queue</h2>
              <p>Work awaiting your decision</p>
            </div>
            <button onClick={() => setActive("Review queue")}>
              View all <LIcon name="arrow" size={14} />
            </button>
          </div>
          <div className="l-review-preview">
            {pendingReviews.length === 0 && (
              <p className="l-empty-copy">Nothing pending review.</p>
            )}
            {pendingReviews.slice(0, 4).map((review) => {
              const submitter = (students || []).find(
                (s) =>
                  String(s._id) === String(review.user?._id ?? review.user),
              );
              return (
                <button
                  key={review._id}
                  onClick={() => openModal("review", review)}
                >
                  <span>
                    <LIcon name="file" />
                  </span>
                  <div>
                    <b>
                      {review.assessment?.title ?? review.title ?? "Submission"}
                    </b>
                    <small>
                      {submitter?.name ?? "Unknown"} ·{" "}
                      {review.submittedAt
                        ? new Date(review.submittedAt).toLocaleDateString()
                        : "—"}
                    </small>
                  </div>
                  <LIcon name="arrow" size={15} />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="l-bottom-grid">
        <section className="l-card">
          <div className="l-card-head">
            <div>
              <h2>Task status</h2>
              <p>
                {nextDeadline
                  ? `Next deadline · ${deadlineLabel}`
                  : "No deadline set"}
              </p>
            </div>
            {daysLeft !== null && (
              <LBadge>
                {daysLeft} DAY{daysLeft === 1 ? "" : "S"} LEFT
              </LBadge>
            )}
          </div>
          <div className="l-milestones">
            {milestones.map(([label, count]) => (
              <div key={label}>
                <span>
                  <b>{label}</b>
                  <small>{Math.round((count / milestoneTotal) * 100)}%</small>
                </span>
                <LProgress value={Math.round((count / milestoneTotal) * 100)} />
              </div>
            ))}
          </div>
        </section>

        {isLeader ? (
          <section className="l-card l-submit-card">
            <span>
              <LIcon name="send" />
            </span>
            <div>
              <h2>Ready for final review?</h2>
              <p>
                {stats.done} of {stats.total} subtasks complete ·{" "}
                {pendingReviews.length} submissions pending review
              </p>
            </div>
            <LButton onClick={() => openModal("submit")}>
              Prepare submission
            </LButton>
          </section>
        ) : (
          <section className="l-card l-submit-card">
            <span>
              <LIcon name="eye" />
            </span>
            <div>
              <h2>Your contribution</h2>
              <p>
                {memberSubtaskStats(user?._id).done} of{" "}
                {memberSubtaskStats(user?._id).total} assigned subtasks complete
              </p>
            </div>
            <LButton
              kind="secondary"
              onClick={() => setActive("Project tasks")}
            >
              View my tasks
            </LButton>
          </section>
        )}
      </div>
    </>
  );
}
