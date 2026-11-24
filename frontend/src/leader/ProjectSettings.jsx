import { useEffect, useMemo, useState } from "react";
import {
  LAvatar,
  LBadge,
  LButton,
  LField,
  LIcon,
  LProgress,
  LSelect,
  PageTitle,
  Stat,
} from "../components/LeaderUI.jsx";
import api from "../api/axios.js";
import { useGroup } from "../context/groupContext.jsx";
import { useUser } from "../context/userContext.jsx";

// Default toggle rows per tab. Saved values on group.settings override these.
const DEFAULT_TOGGLES = {
  permissions: [
    ["Members can comment on all tasks", true],
    ["Members can view team contribution totals", true],
    ["Members can upload shared project files", true],
    ["Members can create their own tasks", false],
    ["Members can invite other people", false],
  ],
  workflow: [
    ["Require members to accept assignments", true],
    ["Require evidence before submission", true],
    ["Require leader review for every task", true],
    ["Allow members to resubmit revisions", true],
    ["Automatically close accepted tasks", true],
  ],
  notifications: [
    ["New task assignments", true],
    ["Task deadline reminders", true],
    ["Member submissions", true],
    ["Overdue tasks", true],
    ["New project comments", false],
    ["Weekly project digest", true],
  ],
  lecturer: [
    ["View project members and roles", true],
    ["View tasks and status history", true],
    ["View submitted evidence", true],
    ["View activity and contribution reports", true],
    ["Receive weekly progress updates", false],
  ],
};

const buildToggles = (saved = {}) =>
  Object.fromEntries(
    Object.entries(DEFAULT_TOGGLES).map(([section, rows]) => [
      section,
      Object.fromEntries(
        rows.map(([label, enabled]) => [
          label,
          saved?.[section]?.[label] ?? enabled,
        ]),
      ),
    ]),
  );

const toDateInput = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toISOString().slice(0, 10)
    : "";
};

export default function ProjectSettings({
  notify,
  openModal,
  groupId,
  refresh,
}) {
  const { groups, fetchGroups } = useGroup();
  const { user } = useUser();
  const [tab, setTab] = useState("General");
  const [saving, setSaving] = useState(false);

  // Selected group (passed by the workspace); falls back to the first group
  // the user leads, then the first group they belong to.
  const group = useMemo(() => {
    const list = Array.isArray(groups) ? groups : [];
    if (groupId) {
      const match = list.find((g) => String(g._id) === String(groupId));
      if (match) return match;
    }
    const uid = String(user?._id ?? "");
    return (
      list.find((g) => String(g.leader?._id ?? g.leader) === uid) ??
      list.find((g) =>
        (g.groupMembers || []).some((m) => String(m._id ?? m) === uid),
      ) ??
      null
    );
  }, [groups, groupId, user?._id]);

  const project = typeof group?.project === "object" ? group.project : null;
  const lecturer = group?.lecturer ?? project?.lecturer ?? null;
  const isLeader =
    group?.myRole === "leader" ||
    String(group?.leader?._id ?? group?.leader) === String(user?._id);

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("Private to invited members");
  const [deadline, setDeadline] = useState("");
  const [reviewPeriod, setReviewPeriod] = useState("48 hours");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [toggles, setToggles] = useState(buildToggles());
  const courseCode = project?.course ?? group?.code ?? "";

  // Load real values whenever the selected group (project) changes.
  useEffect(() => {
    const saved = group?.settings ?? {};
    setProjectName(saved.general?.name ?? project?.title ?? group?.name ?? "");
    setDescription(saved.general?.description ?? project?.description ?? "");
    setVisibility(saved.general?.visibility ?? "Private to invited members");
    setDeadline(toDateInput(saved.general?.deadline ?? project?.deadline));
    setReviewPeriod(saved.workflow?.reviewPeriod ?? "48 hours");
    setTaskPriority(saved.workflow?.taskPriority ?? "Medium");
    setToggles(buildToggles(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?._id]);

  const setToggle = (section, label, value) =>
    setToggles((current) => ({
      ...current,
      [section]: { ...current[section], [label]: value },
    }));

  // Saves the current tab under group.settings.<section>.
  const save = async () => {
    if (!group?._id) return notify("No project selected");
    const sections = {
      General: {
        general: {
          name: projectName,
          description,
          visibility,
          deadline: deadline || null,
        },
      },
      "Access & roles": { permissions: toggles.permissions },
      "Task workflow": {
        workflow: { ...toggles.workflow, reviewPeriod, taskPriority },
      },
      Notifications: { notifications: toggles.notifications },
      "Lecturer access": { lecturer: toggles.lecturer },
    };
    const payload = sections[tab];
    if (!payload) return;
    setSaving(true);
    try {
      await api.put(`/groups/${group._id}`, {
        settings: { ...(group.settings ?? {}), ...payload },
      });
      await (refresh ?? fetchGroups)?.();
      notify(`${tab} settings saved`);
    } catch (err) {
      //console.error("Save settings failed:", err);
      notify(`Failed to save ${tab} settings`);
    } finally {
      setSaving(false);
    }
  };
  const locked = !isLeader || saving;
  return (
    <>
      <PageTitle
        eyebrow="PROJECT ADMINISTRATION"
        title="Project settings"
        description="Manage project details, permissions, review rules, notifications, and lecturer access."
      >
        <LButton onClick={save} disabled={locked}>
          <LIcon name="check" /> Save changes
        </LButton>
      </PageTitle>
      <div className="l-settings-layout">
        <nav>
          {[
            ["General", "settings"],
            ["Access & roles", "shield"],
            ["Task workflow", "tasks"],
            ["Notifications", "bell"],
            ["Lecturer access", "eye"],
            ["Danger zone", "alert"],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={tab === label ? "active" : ""}
              onClick={() => setTab(label)}
            >
              <LIcon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <section className="l-card l-settings-panel">
          {tab === "General" && (
            <>
              <SettingsHeading
                title="Project details"
                text="Information visible to all project members."
              />
              <LField
                label="Project name"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
              <label className="l-field">
                <span>Project description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <div className="l-form-grid">
                <LField
                  label="Course code"
                  value={courseCode}
                  onChange={() => {}}
                />
                <LField
                  label="Final deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                />
              </div>
              <LSelect
                label="Project visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
              >
                <option>Private to invited members</option>
                <option>Visible to course members</option>
                <option>Visible by invitation link</option>
              </LSelect>
              <LButton onClick={save} disabled={locked}>
                Save project details
              </LButton>
            </>
          )}
          {tab === "Access & roles" && (
            <>
              <SettingsHeading
                title="Member permissions"
                text="Control what project members can change."
              />
              {DEFAULT_TOGGLES.permissions.map(([label]) => (
                <ToggleRow
                  key={label}
                  label={label}
                  description="Applies to all current and future members."
                  enabled={toggles.permissions[label]}
                  onChange={(value) => setToggle("permissions", label, value)}
                  disabled={!isLeader}
                />
              ))}
              <LButton onClick={save} disabled={locked}>
                Save permissions
              </LButton>
            </>
          )}
          {tab === "Task workflow" && (
            <>
              <SettingsHeading
                title="Task and review workflow"
                text="Set the quality gates used before final submission."
              />
              {DEFAULT_TOGGLES.workflow.map(([label]) => (
                <ToggleRow
                  key={label}
                  label={label}
                  description="Recommended for a reliable contribution trail."
                  enabled={toggles.workflow[label]}
                  onChange={(value) => setToggle("workflow", label, value)}
                  disabled={!isLeader}
                />
              ))}
              <div className="l-form-grid">
                <LSelect
                  label="Default review period"
                  value={reviewPeriod}
                  onChange={(event) => setReviewPeriod(event.target.value)}
                >
                  <option>24 hours</option>
                  <option>48 hours</option>
                  <option>72 hours</option>
                </LSelect>
                <LSelect
                  label="Default task priority"
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </LSelect>
              </div>
              <LButton onClick={save} disabled={locked}>
                Save workflow
              </LButton>
            </>
          )}
          {tab === "Notifications" && (
            <>
              <SettingsHeading
                title="Project notifications"
                text="Choose which team events should generate alerts."
              />
              {DEFAULT_TOGGLES.notifications.map(([label]) => (
                <ToggleRow
                  key={label}
                  label={label}
                  description="Send in-app and email notifications."
                  enabled={toggles.notifications[label]}
                  onChange={(value) => setToggle("notifications", label, value)}
                  disabled={!isLeader}
                />
              ))}
              <LButton onClick={save} disabled={locked}>
                Save notification rules
              </LButton>
            </>
          )}
          {tab === "Lecturer access" && (
            <>
              <SettingsHeading
                title="Lecturer visibility"
                text="Control assessment access and final submission."
              />
              {lecturer ? (
                <div className="l-access-card">
                  <span>
                    <LIcon name="shield" />
                  </span>
                  <div>
                    <b>{lecturer.name ?? "Lecturer"}</b>
                    <p>
                      {lecturer.email ? `${lecturer.email} · ` : ""}Full project
                      access
                    </p>
                  </div>
                  <LBadge tone="green">ACTIVE</LBadge>
                </div>
              ) : (
                <p className="l-empty-copy">
                  No lecturer is linked to this project yet.
                </p>
              )}
              {DEFAULT_TOGGLES.lecturer.map(([label]) => (
                <ToggleRow
                  key={label}
                  label={label}
                  description="Included in lecturer project access."
                  enabled={toggles.lecturer[label]}
                  onChange={(value) => setToggle("lecturer", label, value)}
                  disabled={!isLeader}
                />
              ))}
              <div className="l-settings-actions">
                <LButton
                  kind="secondary"
                  onClick={() => notify("Access invitation copied")}
                >
                  <LIcon name="users" /> Invite another lecturer
                </LButton>
                <LButton
                  onClick={() => openModal("submit")}
                  disabled={!isLeader}
                >
                  <LIcon name="send" /> Submit project
                </LButton>
              </div>
            </>
          )}
          {tab === "Danger zone" && (
            <>
              <SettingsHeading
                title="Danger zone"
                text="These actions affect every member and may not be reversible."
              />
              <div className="l-danger-row">
                <div>
                  <b>Transfer leadership</b>
                  <p>Assign another active member as the group leader.</p>
                </div>
                <LButton kind="secondary">Transfer</LButton>
              </div>
              <div className="l-danger-row">
                <div>
                  <b>Export and close project</b>
                  <p>Download a final archive and prevent further changes.</p>
                </div>
                <LButton kind="secondary">Export & close</LButton>
              </div>
              <div className="l-danger-row critical">
                <div>
                  <b>Archive project</b>
                  <p>Make this project read-only for all members.</p>
                </div>
                <LButton
                  kind="danger"
                  disabled={!isLeader}
                  onClick={() => openModal("danger")}
                >
                  Archive project
                </LButton>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

function SettingsHeading({ title, text }) {
  return (
    <div className="l-settings-heading">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function ToggleRow({ label, description, enabled, onChange, disabled }) {
  return (
    <label className="l-toggle-row">
      <span>
        <b>{label}</b>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={Boolean(enabled)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
