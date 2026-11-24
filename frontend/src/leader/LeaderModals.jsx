import { useMemo, useState } from "react";
import { useUser } from "../context/userContext.jsx";
import {
  LAvatar,
  LBadge,
  LButton,
  LField,
  LIcon,
  LProgress,
  LSelect,
  LeaderModal,
} from "../components/LeaderUI.jsx";

// ---- shared helpers: backend shapes -> what the modals render ----
const DONE = ["done", "complete", "completed"];

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

const toDateInput = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toISOString().slice(0, 10)
    : "";
};

const formatDue = (value) => {
  if (!value) return "No deadline";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// backend status <-> label used in the UI
const STATUS_TO_LABEL = {
  todo: "To do",
  "in-progress": "In progress",
  "in-review": "In review",
  review: "In review",
  submitted: "In review",
  revision: "Revision",
  changes_requested: "Revision",
  done: "Complete",
  complete: "Complete",
  completed: "Complete",
};
const LABEL_TO_STATUS = {
  "To do": "todo",
  "In progress": "in-progress",
  "In review": "in-review",
  Revision: "revision",
  Complete: "done",
};
const statusLabel = (raw) =>
  STATUS_TO_LABEL[String(raw ?? "todo").toLowerCase()] ?? "To do";

const fileName = (file) =>
  typeof file === "string"
    ? file
    : (file?.originalName ?? file?.name ?? file?.filename ?? "file");

const idOf = (ref) => String(ref?._id ?? ref ?? "");

export function TaskModal({ task, members, close, save }) {
  const [form, setForm] = useState(() =>
    task
      ? {
          title: task.title ?? task.name ?? "",
          description: task.description ?? "",
          assignee: idOf(task.assignee),
          due: toDateInput(task.dueDate ?? task.deadline ?? task.due),
          priority: capitalize(task.priority) || "Medium",
          status: statusLabel(task.status),
        }
      : {
          title: "",
          description: "",
          assignee: idOf(members[0]),
          due: "",
          priority: "Medium",
          status: "To do",
        },
  );
  const [notifyMember, setNotifyMember] = useState(true);
  const change = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  // Sends a backend-shaped payload (ids and backend status values).
  const submit = () =>
    save({
      title: form.title,
      description: form.description,
      assignee: form.assignee || null,
      dueDate: form.due,
      priority: form.priority.toLowerCase(),
      status: LABEL_TO_STATUS[form.status] ?? "todo",
      notifyAssignee: notifyMember,
    });
  return (
    <LeaderModal
      title={task ? "Edit project task" : "Create a new task"}
      subtitle="Define clear ownership, requirements, and a deadline."
      close={close}
      footer={
        <>
          <LButton kind="secondary" onClick={close}>
            Cancel
          </LButton>
          <LButton disabled={!form.title || !form.due} onClick={submit}>
            {task ? "Save changes" : "Create and assign"}
          </LButton>
        </>
      }
    >
      <div className="l-form-stack">
        <LField
          label="Task title"
          value={form.title}
          onChange={(event) => change("title", event.target.value)}
          placeholder="What needs to be completed?"
        />
        <label className="l-field">
          <span>Description and acceptance criteria</span>
          <textarea
            value={form.description}
            onChange={(event) => change("description", event.target.value)}
            placeholder="Add context, requirements, and what good work looks like..."
          />
        </label>
        <div className="l-form-grid">
          <LSelect
            label="Assign to"
            value={form.assignee}
            onChange={(event) => change("assignee", event.target.value)}
          >
            <option value="">No assignee</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </LSelect>
          <LField
            label="Deadline"
            type="date"
            value={form.due}
            onChange={(event) => change("due", event.target.value)}
          />
        </div>
        <div className="l-form-grid">
          <LSelect
            label="Priority"
            value={form.priority}
            onChange={(event) => change("priority", event.target.value)}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </LSelect>
          <LSelect
            label="Status"
            value={form.status}
            onChange={(event) => change("status", event.target.value)}
          >
            <option>To do</option>
            <option>In progress</option>
            <option>In review</option>
            <option>Revision</option>
            <option>Complete</option>
          </LSelect>
        </div>
        <label className="l-check">
          <input
            type="checkbox"
            checked={notifyMember}
            onChange={(event) => setNotifyMember(event.target.checked)}
          />{" "}
          Notify the assigned member by email and in-app alert
        </label>
      </div>
    </LeaderModal>
  );
}

export function InviteModal({ close, invite, inviteCode }) {
  const { students } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  // Match the typed email to a registered user so the backend gets a userId.
  const existing = useMemo(
    () =>
      (students || []).find(
        (student) =>
          email &&
          String(student.email ?? "").toLowerCase() ===
            email.trim().toLowerCase(),
      ) ?? null,
    [students, email],
  );
  const copyCode = () => navigator.clipboard?.writeText(inviteCode);
  return (
    <LeaderModal
      title="Invite a team member"
      subtitle="Add someone by email or share the project code."
      close={close}
      footer={
        <>
          <LButton kind="secondary" onClick={close}>
            Cancel
          </LButton>
          <LButton
            disabled={!name || !email}
            onClick={() =>
              invite({
                name: existing?.name ?? name,
                email: email.trim(),
                role,
                userId: existing?._id,
              })
            }
          >
            Send invitation
          </LButton>
        </>
      }
    >
      <div className="l-form-stack">
        <LField
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Member's full name"
        />
        <LField
          label="University email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@university.edu"
        />
        {email && !existing && (
          <p className="l-empty-copy">
            No registered student found with this email yet.
          </p>
        )}
        <LSelect
          label="Project role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option>Member</option>
          <option>Researcher</option>
          <option>Data analyst</option>
          <option>Designer</option>
          <option>Writer</option>
        </LSelect>
        {inviteCode && (
          <div className="l-invite-code">
            <div>
              <small>PROJECT INVITE CODE</small>
              <b>{inviteCode}</b>
              <p>Anyone with this code can request to join.</p>
            </div>
            <LButton kind="secondary" onClick={copyCode}>
              Copy code
            </LButton>
          </div>
        )}
      </div>
    </LeaderModal>
  );
}

export function MemberModal({ member, tasks = [], close, reassign, remove }) {
  // `tasks` is already this member's tasks; compute their stats from it.
  const stats = useMemo(() => {
    const completed = tasks.filter((task) =>
      DONE.includes(String(task.status).toLowerCase()),
    ).length;
    const contribution = tasks.length
      ? Math.round((completed / tasks.length) * 100)
      : 0;
    const tracked = tasks.reduce(
      (sum, task) => sum + (Number(task.hours ?? task.hoursSpent) || 0),
      0,
    );
    return {
      completed,
      contribution,
      hours: tracked ? `${Math.round(tracked * 10) / 10}h` : "—",
      status:
        tasks.length > 0 && contribution < 30 ? "Needs support" : "Active",
    };
  }, [tasks]);
  const role = capitalize(member.role) || "Member";
  return (
    <LeaderModal
      title={member.name}
      subtitle={`${role} · ${member.email ?? ""}`}
      close={close}
    >
      <div className="l-member-detail">
        <div className="l-member-detail-head">
          <LAvatar initials={initialsOf(member.name)} />
          <div>
            <b>{stats.contribution}% contribution score</b>
            <LProgress value={stats.contribution} />
          </div>
          <LBadge tone={stats.status === "Needs support" ? "rose" : "green"}>
            {stats.status}
          </LBadge>
        </div>
        <div className="l-member-detail-stats">
          <span>
            <b>{tasks.length}</b>
            <small>Assigned</small>
          </span>
          <span>
            <b>{stats.completed}</b>
            <small>Completed</small>
          </span>
          <span>
            <b>{stats.hours}</b>
            <small>Tracked</small>
          </span>
        </div>
        <h3>Current assignments</h3>
        {tasks.length ? (
          tasks.map((task) => (
            <div className="l-mini-task" key={task._id ?? task.id}>
              <span>
                <b>{task.title ?? task.name}</b>
                <small>
                  Due {formatDue(task.dueDate ?? task.deadline ?? task.due)}
                </small>
              </span>
              <LBadge>{statusLabel(task.status)}</LBadge>
            </div>
          ))
        ) : (
          <p className="l-empty-copy">This member has no assigned tasks.</p>
        )}
        <div className="l-member-detail-actions">
          <LButton kind="secondary" onClick={reassign}>
            <LIcon name="edit" /> Reassign work
          </LButton>
          <LButton kind="danger" onClick={remove}>
            <LIcon name="trash" /> Remove member
          </LButton>
        </div>
      </div>
    </LeaderModal>
  );
}

export function ReassignModal({ member, members, tasks, close, save }) {
  // Match by member id (the backend stores an id, not a name).
  const memberTasks = tasks.filter(
    (task) => idOf(task.assignee) === String(member._id),
  );
  const [taskId, setTaskId] = useState(memberTasks[0]?._id ?? "");
  const others = members.filter(
    (item) => String(item._id) !== String(member._id),
  );
  const [assignee, setAssignee] = useState(others[0]?._id ?? "");
  return (
    <LeaderModal
      title="Change task assignment"
      subtitle={`Move work currently assigned to ${member.name}.`}
      close={close}
      footer={
        <>
          <LButton kind="secondary" onClick={close}>
            Cancel
          </LButton>
          <LButton
            disabled={!taskId || !assignee}
            onClick={() => save(taskId, assignee)}
          >
            Reassign task
          </LButton>
        </>
      }
    >
      <LSelect
        label="Task to move"
        value={taskId}
        onChange={(event) => setTaskId(event.target.value)}
      >
        {memberTasks.map((task) => (
          <option value={task._id} key={task._id}>
            {task.title ?? task.name}
          </option>
        ))}
      </LSelect>
      <LSelect
        label="New assignee"
        value={assignee}
        onChange={(event) => setAssignee(event.target.value)}
      >
        {others.map((item) => (
          <option key={item._id} value={item._id}>
            {item.name}
          </option>
        ))}
      </LSelect>
    </LeaderModal>
  );
}

export function ReviewModal({ review, close, decide }) {
  // `review` is the raw assessment answer from the backend.
  const rawFiles = review.files ?? review.attachments ?? [];
  const files = rawFiles.map(fileName);
  const memberName = review.user?.name ?? review.member ?? "Unknown member";
  const taskTitle =
    review.assessment?.title ??
    review.title ??
    review.task?.title ??
    "Submission";
  const note =
    review.note ?? review.text ?? review.comment ?? "No submission note.";
  const [feedback, setFeedback] = useState("");
  const [activeFile, setActiveFile] = useState(files[0]);
  const activeRaw = rawFiles[files.indexOf(activeFile)];
  const activeUrl =
    typeof activeRaw === "object" ? (activeRaw?.url ?? activeRaw?.path) : null;
  return (
    <LeaderModal
      title="Review submitted work"
      subtitle={`${taskTitle} · Submitted by ${memberName}`}
      close={close}
    >
      <div className="l-review-modal">
        <div className="l-file-preview">
          <div>
            <LIcon name="file" size={38} />
            <b>{activeFile ?? "No files attached"}</b>
            <small>Document preview</small>
          </div>
          <LButton
            kind="secondary"
            disabled={!activeUrl}
            onClick={() => window.open(activeUrl, "_blank", "noopener")}
          >
            <LIcon name="download" /> Download
          </LButton>
        </div>
        <div className="l-review-files">
          {files.map((file) => (
            <button
              key={file}
              className={activeFile === file ? "active" : ""}
              onClick={() => setActiveFile(file)}
            >
              <LIcon name="file" size={15} />
              {file}
            </button>
          ))}
        </div>
        <div className="l-submission-note">
          <b>Member’s submission note</b>
          <p>{note}</p>
        </div>
        <label className="l-field">
          <span>Feedback to member</span>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Give specific, actionable feedback or explain your decision..."
          />
        </label>
        <div className="l-review-decisions">
          <LButton
            kind="warning"
            disabled={!feedback.trim()}
            onClick={() => decide("Revision required", feedback)}
          >
            <LIcon name="edit" /> Request revision
          </LButton>
          <LButton kind="success" onClick={() => decide("Accepted", feedback)}>
            <LIcon name="check" /> Accept work
          </LButton>
        </div>
      </div>
    </LeaderModal>
  );
}

export function SubmitModal({ close, submit, tasks = [], reviews = [] }) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const total = tasks.length;
  const done = tasks.filter((task) =>
    DONE.includes(String(task.status).toLowerCase()),
  ).length;
  const open = total - done;
  const evidence = tasks.reduce(
    (sum, task) =>
      sum + (task.evidence ?? task.files ?? task.attachments ?? []).length,
    0,
  );
  const pending = reviews.length;
  return (
    <LeaderModal
      title="Submit project to lecturer"
      subtitle="Create a read-only assessment snapshot of the current project."
      close={close}
      footer={
        <>
          <LButton kind="secondary" onClick={close}>
            Cancel
          </LButton>
          <LButton disabled={!confirmed} onClick={() => submit(message)}>
            <LIcon name="send" /> Submit project
          </LButton>
        </>
      }
    >
      <div className="l-submit-checklist">
        <div className={open > 0 ? "warning" : ""}>
          <LIcon name={open > 0 ? "alert" : "check"} />
          <span>
            <b>
              {done} of {total} tasks complete
            </b>
            <small>
              {open > 0
                ? `${open} task${open === 1 ? "" : "s"} still open`
                : "All tasks are complete"}
            </small>
          </span>
        </div>
        <div>
          <LIcon name="check" />
          <span>
            <b>
              {evidence} evidence file{evidence === 1 ? "" : "s"} attached
            </b>
            <small>Across all project tasks</small>
          </span>
        </div>
        <div className={pending > 0 ? "warning" : ""}>
          <LIcon name={pending > 0 ? "alert" : "check"} />
          <span>
            <b>
              {pending} submission{pending === 1 ? "" : "s"} awaiting review
            </b>
            <small>
              {pending > 0
                ? "These will be included as pending work"
                : "Nothing is waiting for your review"}
            </small>
          </span>
        </div>
      </div>
      <label className="l-field">
        <span>Message to lecturer</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Add context about the project status, limitations, or submission..."
        />
      </label>
      <label className="l-check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />{" "}
        I confirm this version is ready for lecturer assessment.
      </label>
    </LeaderModal>
  );
}

export function ConfirmModal({ title, message, close, confirm }) {
  return (
    <LeaderModal
      title={title}
      subtitle="Please confirm this action."
      close={close}
      footer={
        <>
          <LButton kind="secondary" onClick={close}>
            Cancel
          </LButton>
          <LButton kind="danger" onClick={confirm}>
            Confirm action
          </LButton>
        </>
      }
    >
      <div className="l-confirm">
        <span>
          <LIcon name="alert" />
        </span>
        <p>{message}</p>
      </div>
    </LeaderModal>
  );
}
