import { useEffect } from "react";
import {
  Badge,
  Button,
  Icon,
  PageTitle,
  Progress,
  Stat,
} from "../components/LecturerUI.jsx";
import { useUser } from "../context/userContext.jsx";
import { useTask } from "../context/taskContext.jsx";
import { useAssessment } from "../context/assesmentContext.jsx";

export default function Portfolio({ groups, setActive, open, exportReport }) {
  const { students, leaders } = useUser();
  const { tasks } = useTask();
  const { assessments, answers, fetchAssessments } = useAssessment();

  useEffect(() => {
    fetchAssessments?.();
  }, [fetchAssessments]);

  const groupsList = Array.isArray(groups) ? groups : [];
  const tasksList = Array.isArray(tasks) ? tasks : [];
  const assessmentsList = Array.isArray(assessments) ? assessments : [];
  const answersList = Array.isArray(answers) ? answers : [];

  // Ready to assess = submitted answers that haven't been graded yet
  const ready = answersList.filter(
    (a) => a.status === "submitted" && !a.assessedAt,
  );

  const assessmentFor = (answer) =>
    assessmentsList.find(
      (a) =>
        String(a._id) === String(answer.assessment?._id ?? answer.assessment),
    );

  const groupNameFor = (answer) => {
    const assessment = assessmentFor(answer);
    const groupIds = assessment?.groups ?? [];
    const group = groupsList.find((g) =>
      groupIds.some((id) => String(id._id ?? id) === String(g._id)),
    );
    return group?.name ?? assessment?.title ?? "Submission";
  };

  const taskTitleFor = (answer) => {
    const assessment = assessmentFor(answer);
    const task = tasksList.find(
      (t) =>
        String(t._id) === String(assessment?.task?._id ?? assessment?.task),
    );
    return task?.title ?? assessment?.title ?? "—";
  };

  const leaderNameFor = (group) => {
    if (group.leader && typeof group.leader === "object") {
      return group.leader.name ?? "—";
    }
    const leader = students?.find(
      (s) => String(s._id) === String(group.leader),
    );
    return leader?.name ?? "—";
  };

  const dueParts = (group) => {
    const raw = group.due ?? group.deadline ?? "";
    const parts = String(raw).split(" ");
    return { day: parts[0] || "—", month: parts[1] || "" };
  };

  const visibleGroups = groupsList.slice(0, 4);

  return (
    <>
      <PageTitle
        eyebrow="LECTURER DASHBOARD"
        title="Group work oversight"
        description="A focused view of progress, assessment readiness, and groups that need your attention."
      >
        <Button kind="secondary" onClick={() => exportReport()}>
          <Icon name="download" /> Export summary
        </Button>
        <Button onClick={() => open("task")}>
          <Icon name="plus" /> Create main task
        </Button>
      </PageTitle>

      <div className="t-stats">
        <Stat
          icon="users"
          label="Active groups"
          value={groupsList.length}
          meta={`Across ${tasksList.length} task${tasksList.length === 1 ? "" : "s"}`}
        />
        <Stat
          icon="file"
          label="Ready to assess"
          value={ready.length}
          meta={`${ready.length} awaiting review`}
        />
        <Stat
          icon="check"
          label="Students covered"
          value={students?.length ?? 0}
          meta={`${leaders?.length ?? 0} appointed leaders`}
        />
        <Stat
          icon="alert"
          label="Needs attention"
          value={groupsList.filter((g) => g.flagged).length}
          meta="Contribution or progress flags"
        />
      </div>

      <div className="t-dashboard-grid">
        <section className="t-card">
          <div className="t-card-head">
            <div>
              <h2>Group progress</h2>
              <p>Live status across your active groups</p>
            </div>
            <button onClick={() => setActive("Groups")}>
              View all groups <Icon name="arrow" size={14} />
            </button>
          </div>
          <div className="t-group-list">
            {visibleGroups.length === 0 && (
              <p className="t-empty-copy">No groups yet.</p>
            )}
            {visibleGroups.map((group) => (
              <button
                key={group._id}
                onClick={() => open("groupDetail", group)}
              >
                <span className="t-group-mark">
                  {(group.name ?? "??").slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <b>{group.name ?? "Untitled group"}</b>
                  <small>
                    {group.code ?? "—"} · Led by {leaderNameFor(group)}
                  </small>
                </div>
                <span className="t-inline-progress">
                  <Progress value={group.progress ?? 0} />
                  <small>{group.progress ?? 0}%</small>
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
                <Icon name="arrow" size={15} />
              </button>
            ))}
          </div>
        </section>

        <section className="t-card">
          <div className="t-card-head">
            <div>
              <h2>Submission queue</h2>
              <p>Submitted work awaiting a decision</p>
            </div>
            <Badge>{ready.length} READY</Badge>
          </div>
          <div className="t-queue">
            {ready.length === 0 && (
              <p className="t-empty-copy">No submissions awaiting review.</p>
            )}
            {ready.slice(0, 5).map((answer) => (
              <button
                key={answer._id}
                onClick={() => open("submission", answer)}
              >
                <span>
                  <Icon name="file" />
                </span>
                <div>
                  <b>{groupNameFor(answer)}</b>
                  <small>
                    {taskTitleFor(answer)} ·{" "}
                    {answer.submittedAt
                      ? new Date(answer.submittedAt).toLocaleDateString()
                      : "—"}
                  </small>
                </div>
                <Icon name="arrow" size={15} />
              </button>
            ))}
          </div>
          <button
            className="t-card-link"
            onClick={() => setActive("Submissions")}
          >
            Open submission workspace
          </button>
        </section>
      </div>

      <div className="t-bottom-grid">
        <section className="t-card t-attention">
          <div className="t-card-head">
            <div>
              <h2>Requires attention</h2>
              <p>Signals based on contribution and progress data</p>
            </div>
          </div>
          {groupsList.filter((g) => g.flagged).length === 0 && (
            <p className="t-empty-copy">Nothing flagged.</p>
          )}
          {groupsList
            .filter((group) => group.flagged)
            .map((group) => (
              <button
                key={group._id}
                onClick={() => open("groupDetail", group)}
              >
                <span>
                  <Icon name="alert" />
                </span>
                <div>
                  <b>{group.name ?? "Untitled group"}</b>
                  <p>
                    {group.status === "At risk"
                      ? "Progress is below the expected trajectory and the deadline is approaching."
                      : "Uneven contribution pattern detected across group members."}
                  </p>
                </div>
                <Badge tone="rose">REVIEW</Badge>
              </button>
            ))}
        </section>

        <section className="t-card t-deadlines">
          <div className="t-card-head">
            <div>
              <h2>Upcoming deadlines</h2>
              <p>Next 14 days</p>
            </div>
          </div>
          {visibleGroups.length === 0 && (
            <p className="t-empty-copy">No upcoming deadlines.</p>
          )}
          {visibleGroups.map((group, index) => {
            const { day, month } = dueParts(group);
            const taskForGroup = tasksList.find(
              (t) => String(t._id) === String(group.task?._id ?? group.task),
            );
            return (
              <div key={group._id}>
                <span>
                  <b>{day}</b>
                  <small>{month}</small>
                </span>
                <div>
                  <b>{taskForGroup?.title ?? group.task?.title ?? "—"}</b>
                  <small>{group.code ?? "—"}</small>
                </div>
                {index < 2 && <i />}
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
