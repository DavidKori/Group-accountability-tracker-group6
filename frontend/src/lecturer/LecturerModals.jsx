import { useState, useEffect } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Icon,
  Modal,
  Progress,
  Toggle,
} from "../components/LecturerUI.jsx";
import "../styles/lecturer.css";
//import { students } from "./data.js";
import api from "../api/axios.js";
import { useTask } from "../context/taskContext.jsx";
import { useUser } from "../context/userContext.jsx";
import { getAvailableMembers } from "./data.js";

export function GroupModal({ group, close, save, mainTaskId }) {
  const emptyForm = {
    name: "",
    code: "",
    leader: "",
    initials: "",
    members: 5,
    numberOfGroups: 1,
    groupLabelType: "alpha",
    singleGroup: true,
    leaderSelection: "random",
    memberSelection: "manual",
    project: "",
    groupMembers: [],
    _id: "",
  };
  const { selectedTask, tasks } = useTask();
  const { students } = useUser();

  const [form, setForm] = useState(group ?? emptyForm);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  // const [selectedMembers, setSelectedMembers] = useState(
  //   group?.groupMembers ?? group?.memberIds ?? [],
  // );
  const [selectedMembers, setSelectedMembers] = useState(
    (group?.groupMembers ?? group?.memberIds ?? []).map((member) =>
      typeof member === "object" ? member._id : member,
    ),
  );
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  // console.log(tasks);
  // If the group prop arrives after mount (refresh case), refill the form.
  useEffect(() => {
    if (group?._id) {
      setForm(group);

      setSelectedMembers(
        (group.groupMembers ?? group.memberIds ?? []).map((member) =>
          typeof member === "object" ? member._id : member,
        ),
      );
    }
  }, [group?._id]);
  // useEffect(() => {
  //   if (group?._id) {
  //     setForm(group);
  //     setSelectedMembers(group.groupMembers ?? group.memberIds ?? []);
  //   }
  // }, [group?._id]);

  // Single source of truth for the active project.
  const activeProject = selectedTask?._id ?? form.project;

  // Students who aren't already in this project.
  const availableMembers = (students || []).filter((student) => {
    const projects = student.project ?? student.projects ?? [];
    return !projects.includes(activeProject);
  });

  useEffect(() => {
    setLoadingMembers(!students);
  }, [students]);

  const searchStudent = (query) => {
    const term = query.toString().trim().toLowerCase();
    if (!term) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const results = availableMembers.filter(
      (s) =>
        s.name?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.studentId?.toString().toLowerCase().includes(term),
    );
    setSearchResults(results);
    setShowResults(true);
  };

  const toggleMember = (studentId) => {
    setSelectedMembers((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
    setForm((prev) => {
      const current = Array.isArray(prev.groupMembers) ? prev.groupMembers : [];
      return {
        ...prev,
        groupMembers: current.includes(studentId)
          ? current.filter((id) => id !== studentId)
          : [...current, studentId],
      };
    });
  };

  const filteredMembers = availableMembers.filter((student) =>
    `${student.name ?? ""} ${student.email ?? ""} ${student.studentId ?? ""}`
      .toLowerCase()
      .includes(memberSearch.trim().toLowerCase()),
  );

  const removeMember = (studentId) => {
    setSelectedMembers((prev) => prev.filter((id) => id !== studentId));
    setForm((prev) => ({
      ...prev,
      groupMembers: Array.isArray(prev.groupMembers)
        ? prev.groupMembers.filter((id) => id !== studentId)
        : [],
    }));
  };
  const selectStudent = (student) => {
    setForm((prev) => ({
      ...prev,
      leader: student._id,
      initials: student.name ? student.name.charAt(0) : "",
    }));

    setSearchResults([]);
    setShowResults(false);
  };
  // const selectStudent = (student) => {
  //   setForm((prev) => ({
  //     ...prev,
  //     leader: student.studentId ?? student._id,
  //     initials: student.name ? student.name.charAt(0) : "",
  //   }));
  //   setSearchResults([]);
  //   setShowResults(false);
  // };

  const change = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "leader") searchStudent(value);
  };

  return (
    <Modal
      title={
        group
          ? `Edit group ${group.name ?? ""}${selectedTask ? ` for ${selectedTask.taskId}` : ""}`
          : `${form.singleGroup ? "Create a single group" : "Create multiple groups"}${selectedTask ? ` for ${selectedTask.taskId}` : ""}`
      }
      subtitle="Set the group identity, course, and appointed leader."
      close={close}
      footer={
        <>
          <Button kind="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={
              form.singleGroup
                ? !form.name || !form.code || !form.leader || !form.project
                : !form.numberOfGroups ||
                  !form.leaderSelection ||
                  !form.groupLabelType ||
                  !form.project
            }
            onClick={() => {
              // console.log(
              //   "project",
              //   form.project.length,
              //   "leader",
              //   form.leader,
              //   "selection",
              //   form.leaderSelection,
              // );
              save({
                ...form,
                initials: form.singleGroup
                  ? form.leader
                      .toString()
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : undefined,
                members: Number(form.members),
                numberOfGroups: Number(form.numberOfGroups),
                groupLabelType: form.groupLabelType,
              });
            }}
          >
            {group
              ? "Save changes"
              : form.singleGroup
                ? "Create group"
                : "Create groups"}
          </Button>
        </>
      }
      onClick={() => {
        setSearchResults([]);
        setShowResults(false);
      }}
    >
      <Button
        onClick={() => setForm({ ...form, singleGroup: !form.singleGroup })}
      >
        {!form.singleGroup ? "Create a single group" : "Create multiple groups"}
      </Button>
      <br />
      <br />

      {form.singleGroup ? (
        <>
          <div className="t-form-grid">
            <Field
              label="Group name"
              value={form.name}
              onChange={change("name")}
              placeholder="e.g. Sustainable Campus"
            />

            {!selectedTask && (
              <Field
                label="Project working on"
                value={form.project}
                onChange={change("project")}
                placeholder="choose Main Project"
                type="select"
                options={(tasks || []).map((e) => e.title)}
                required
              />
            )}

            <Field
              label="Module and group"
              value={form.code}
              onChange={change("code")}
              placeholder={`ENV 304 · Group ${form.groupLabelType === "alpha" ? "A" : 1}`}
            />

            <div className="t-search-container">
              {/* <Field
                label="Group leader"
                value={form.leader.name}
                onChange={change("leader")}
                placeholder="Search student name"
              /> */}
              <Field
                label="Group leader"
                value={
                  typeof form.leader === "object"
                    ? (form.leader?.name ?? "")
                    : (form.leader ?? "")
                }
                onChange={change("leader")}
                placeholder="Search student name"
              />

              {form.leader && (
                <button
                  type="button"
                  className="t-clear-search"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, leader: "", initials: "" }));
                    setSearchResults([]);
                    setShowResults(false);
                  }}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}

              {showResults && (
                <div className="t-search-results">
                  {searchResults.length > 0 ? (
                    searchResults.map((student) => (
                      <button
                        type="button"
                        key={student._id}
                        onClick={() => selectStudent(student)}
                      >
                        <span>{student.name}</span>
                        <small>
                          {student.email} · {student.studentId}
                        </small>
                      </button>
                    ))
                  ) : (
                    <p className="t-no-results">
                      No eligible students found matching "{form.leader}".
                    </p>
                  )}
                </div>
              )}
            </div>

            <Field
              label="Number of members"
              value={form.members}
              onChange={change("members")}
              type="number"
            />

            <Field
              label="Group label type"
              value={form.groupLabelType}
              onChange={change("groupLabelType")}
              placeholder="choose how groups are labelled"
              type="select"
              options={["alpha", "numeric"]}
            />

            {form.name && (
              <p className="t-info group-name-preview">
                Eg.{" "}
                <span
                  style={{
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    display: "inline",
                  }}
                >
                  {form.groupLabelType === "alpha"
                    ? form.name + " A"
                    : form.name + " 1"}{" "}
                </span>
                will be the full group name.
              </p>
            )}

            <Field
              label="choose member selection method"
              value={form.memberSelection}
              onChange={change("memberSelection")}
              placeholder="choose how members are assigned"
              type="select"
              options={["manual", "random"]}
            />
          </div>

          {form.memberSelection === "manual" && (
            <div className="t-member-selection">
              <div className="t-member-heading">
                <div>
                  <h4>Select group members</h4>
                  <p>
                    Only students who are not assigned to this project are
                    listed.
                  </p>
                </div>
                <span className="t-member-count">
                  {selectedMembers.length} selected
                </span>
              </div>

              {selectedMembers.length > 0 && (
                <div className="t-selected-members">
                  {selectedMembers.map((id) => {
                    const student = availableMembers.find(
                      (member) => member._id === id,
                    );
                    if (!student) return null;
                    return (
                      <div key={id} className="t-selected-member">
                        <span>{student.name}</span>
                        <button
                          type="button"
                          onClick={() => removeMember(id)}
                          aria-label={`Remove ${student.name}`}
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="t-member-search">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search students by name, email or ID..."
                />
                {memberSearch && (
                  <button type="button" onClick={() => setMemberSearch("")}>
                    &times;
                  </button>
                )}
              </div>

              <div className="t-member-list">
                {loadingMembers ? (
                  <p className="t-member-empty">
                    Loading available students...
                  </p>
                ) : filteredMembers.length > 0 ? (
                  filteredMembers.map((student) => {
                    const checked = selectedMembers.includes(student._id);
                    return (
                      <label
                        key={student._id}
                        className={`t-member-option ${checked ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(student._id)}
                        />
                        <div className="t-member-avatar">
                          {student.initials ??
                            (student.name
                              ? student.name.charAt(0).toUpperCase()
                              : "?")}
                        </div>
                        <div className="t-member-info">
                          <strong>{student.name}</strong>
                          <small>{student.email}</small>
                          <small>{student.studentId}</small>
                        </div>
                        {checked && <span className="t-member-check">✓</span>}
                      </label>
                    );
                  })
                ) : (
                  <div className="t-member-empty">
                    {!activeProject
                      ? "Select a project to see available students."
                      : memberSearch
                        ? `No students found matching "${memberSearch}".`
                        : "No available students for this project (all students may already be assigned)."}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="t-info">
            <Icon name="shield" />
            <p>
              The appointed leader can manage tasks and review member work. You
              retain full lecturer access.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="t-form-grid">
            <Field
              label="Number of groups"
              value={form.numberOfGroups}
              onChange={change("numberOfGroups")}
              placeholder="e.g. 5"
              type="number"
            />

            <Field
              label="Choose Group leader"
              value={form.leaderSelection}
              onChange={change("leaderSelection")}
              placeholder="choose how leaders are assigned"
              type="select"
              options={["manual", "random"]}
            />

            {form.leaderSelection === "manual" ? (
              <div className="t-leader-selection">
                {availableMembers.map((student) => (
                  <label key={student._id}>
                    <input
                      type="checkbox"
                      value={student.studentId}
                      checked={
                        Array.isArray(form.leader) &&
                        form.leader.includes(student.studentId)
                      }
                      onChange={(event) => {
                        const currentLeaders = Array.isArray(form.leader)
                          ? form.leader
                          : [];
                        const newLeaders = event.target.checked
                          ? [...currentLeaders, student.studentId]
                          : currentLeaders.filter(
                              (id) => id !== student.studentId,
                            );
                        setForm({ ...form, leader: newLeaders });
                      }}
                    />
                    {student.name}
                  </label>
                ))}
              </div>
            ) : (
              <></>
            )}

            <Field
              label="Group label type"
              value={form.groupLabelType}
              onChange={change("groupLabelType")}
              placeholder="choose how groups are labelled"
              type="select"
              options={["alpha", "numeric"]}
            />

            <Field
              label=" Members per group"
              value={form.members}
              onChange={change("members")}
              type="number"
            />
          </div>

          <div className="t-info">
            <Icon name="shield" />
            <p>
              The appointed leaders can manage tasks and review member work. You
              retain full lecturer access.
            </p>
          </div>
        </>
      )}
    </Modal>
  );
}

export function TaskModal({ task, groupCount, close, save }) {
  const emptyForm = {
    title: "",
    course: "",
    groups: groupCount ?? 0,
    deadline: "",
    rubric: "",
    taskId: "",
    description: "",
    requireIndividualEvidence: false,
  };

  const [form, setForm] = useState(task ?? emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // THE FIX: whenever the task prop changes (null -> real task, or a
  // different task), refill the form.
  useEffect(() => {
    if (task && typeof task === "object") {
      setForm(task);
    }
  }, [task]);

  const change = (key, type) => (event) => {
    const value =
      type === "checkbox" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createTask = async (taskData) => {
    try {
      setSaving(true);
      setError("");
      const response = await api.post("projects", taskData);
      //console.log("response:", response);
      const savedTask =
        response?.data?.task ??
        response?.data?.data ??
        response?.data ??
        response;
      if (!savedTask?._id) {
        throw new Error("The backend did not return a valid task ID.");
      }
      return savedTask;
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to create task.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  };
  const updateTask = async (taskData) => {
    try {
      setSaving(true);
      setError("");
      const response = await api.put(`/projects/${task._id}`, taskData);
      //console.log("response:", response);
      const savedTask =
        response?.data?.task ??
        response?.data?.data ??
        response?.data ??
        response;
      if (!savedTask?._id) {
        throw new Error("The backend did not return a valid task ID.");
      }
      return savedTask;
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to create task.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const taskData = { ...form, groups: Number(form.groups) };
    const savedTask = await createTask(taskData);
    if (!savedTask) return;
    await save(savedTask);
  };
  const handleUpdate = async () => {
    const taskData = { ...form, groups: Number(form.groups) };
    const savedTask = await updateTask(taskData);
    if (!savedTask) return;
    await save(savedTask);
  };

  return (
    <Modal
      wide
      title={task?._id ? "Edit main task" : "Create a main task"}
      subtitle="Publish one consistent brief to selected group leaders."
      close={close}
      footer={
        <>
          <Button kind="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={saving || !form.title || !form.course || !form.deadline}
            onClick={task?._id ? handleUpdate : handleSubmit}
          >
            {saving
              ? "Saving..."
              : task?._id
                ? "Save task"
                : "Proceed to group assigning..."}
          </Button>
        </>
      }
    >
      {error && <p className="t-error">{error}</p>}
      <div className="t-form-grid">
        <Field
          label="Task title"
          value={form.title}
          onChange={change("title")}
          placeholder="Final group research project"
        />
        <Field
          label="Module code"
          value={form.course}
          onChange={change("course")}
          placeholder="ENV 304"
        />
        <Field
          label="Number of assigned groups"
          value={form.groups}
          onChange={change("groups")}
          type="number"
        />
        <Field
          label="Final deadline"
          value={form.deadline}
          onChange={change("deadline")}
          type="date"
        />
      </div>
      <Field label="Brief and expected deliverables">
        <textarea
          value={form.description}
          onChange={change("description")}
          placeholder="Describe the task, deliverables, evidence, and submission expectations..."
        />
      </Field>
      <Field
        label="Assessment rubric"
        value={form.rubric}
        onChange={change("rubric")}
        placeholder="Research quality · Analysis · Evidence · Team contribution"
      />
      <Toggle
        label="Require individual contribution evidence"
        text="Each member must attach evidence to completed subtasks."
        checked={!!form.requireIndividualEvidence}
        onChange={change("requireIndividualEvidence", "checkbox")}
      />
    </Modal>
  );
}

export default function GroupDetail({ group, close, open, toggleFlag }) {
  const { students } = useUser();

  if (!group) return null;

  const resolveLeader = () => {
    if (group.leader && typeof group.leader === "object") {
      return group.leader;
    }
    const leader = (students || []).find(
      (s) => String(s._id) === String(group.leader),
    );
    return leader ?? null;
  };

  const resolveMember = (member) => {
    if (member && typeof member === "object") return member;
    return (
      (students || []).find((s) => String(s._id) === String(member)) ?? null
    );
  };

  const leader = resolveLeader();
  const memberIds = group.groupMembers ?? group.members ?? [];
  const members = memberIds.map(resolveMember).filter(Boolean).slice(0, 6);

  const initialsOf = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <Modal
      wide
      title={group.name ?? "Untitled group"}
      subtitle={`${group.code ?? "No module"} · Led by ${leader?.name ?? "—"}`}
      close={close}
      footer={
        <>
          <Button
            kind="secondary"
            onClick={() => {
              close();
              open("group", group);
            }}
          >
            <Icon name="edit" /> Edit group
          </Button>
          <Button
            kind={group.flagged ? "primary" : "secondary"}
            onClick={toggleFlag}
          >
            {group.flagged ? "Resolve flag" : "Flag for follow-up"}
          </Button>
        </>
      }
    >
      <div className="t-detail-hero">
        <div>
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
          <h3>{group.task ?? "No task assigned"}</h3>
          <p>
            {group.due ? `Final deadline ${group.due}. ` : "No deadline set. "}
            Lecturer access includes task history, all evidence, feedback, and
            individual contribution records.
          </p>
        </div>
        <span>
          <b>{group.progress ?? 0}%</b>
          <small>complete</small>
        </span>
      </div>

      <div className="t-detail-stats">
        <div>
          <Icon name="users" />
          <span>
            <small>Team size</small>
            <b>{memberIds.length} students</b>
          </span>
        </div>
        <div>
          <Icon name="tasks" />
          <span>
            <small>Group progress</small>
            <b>{group.progress ?? 0}%</b>
          </span>
        </div>
        <div>
          <Icon name="file" />
          <span>
            <small>Flagged</small>
            <b>{group.flagged ? "Yes" : "No"}</b>
          </span>
        </div>
      </div>

      <h3 className="t-section-label">Team members</h3>
      <div className="t-member-snapshot">
        {members.length === 0 && (
          <p className="t-empty-copy">No members assigned yet.</p>
        )}
        {members.map((member) => (
          <button
            key={member._id}
            onClick={() => {
              close();
              open("student", member);
            }}
          >
            <Avatar initials={initialsOf(member.name)} />
            <span>
              <b>{member.name ?? "Unnamed"}</b>
              <small>
                {member.studentId ?? "—"} · {member.email ?? "—"}
              </small>
            </span>
            <Icon name="arrow" size={14} />
          </button>
        ))}
      </div>

      <h3 className="t-section-label">Overall progress</h3>
      <Progress value={group.progress ?? 0} />
    </Modal>
  );
}

export function AssessmentModal({ submission, close, save }) {
  const [score, setScore] = useState(submission.score);
  const [feedback, setFeedback] = useState("");
  return (
    <Modal
      wide
      title={`Assess ${submission.group}`}
      subtitle={`${submission.task} · Submitted ${submission.submitted}`}
      close={close}
      footer={
        <>
          <Button
            kind="secondary"
            onClick={() => save({ status: "Changes requested", score: "" })}
          >
            Request changes
          </Button>
          <Button
            disabled={!score || Number(score) > 100}
            onClick={() => save({ status: "Assessed", score })}
          >
            <Icon name="check" /> Publish assessment
          </Button>
        </>
      }
    >
      <div className="t-assessment">
        <section>
          <div className="t-file-preview">
            <span>
              <Icon name="file" size={30} />
            </span>
            <div>
              <b>Final submission package</b>
              <small>
                {submission.files} files · Report, supporting evidence, and
                contribution logs
              </small>
            </div>
            <Button kind="secondary">
              <Icon name="download" /> Download all
            </Button>
          </div>
          <div className="t-document">
            <small>SUBMISSION NOTE</small>
            <p>{submission.note}</p>
            <h3>Evidence integrity</h3>
            <ul>
              <li>
                <Icon name="check" /> {submission.files} files available and
                readable
              </li>
              <li>
                <Icon name="check" /> Member task histories included
              </li>
              <li>
                <Icon
                  name={
                    submission.status === "Changes requested"
                      ? "alert"
                      : "check"
                  }
                />{" "}
                Contribution record{" "}
                {submission.status === "Changes requested"
                  ? "requires review"
                  : "is complete"}
              </li>
            </ul>
          </div>
        </section>
        <aside>
          <h3>Assessment decision</h3>
          <Field
            label="Overall score (%)"
            value={score}
            onChange={(event) => setScore(event.target.value)}
            type="number"
          />
          <Field label="Feedback to group">
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Provide clear feedback linked to the rubric..."
            />
          </Field>
          <div className="t-rubric">
            {[
              "Research and analysis",
              "Quality of evidence",
              "Final deliverable",
              "Team contribution",
            ].map((item) => (
              <label key={item}>
                <span>{item}</span>
                <select defaultValue="">
                  <option value="" disabled>
                    Score
                  </option>
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Developing</option>
                  <option>Insufficient</option>
                </select>
              </label>
            ))}
          </div>
        </aside>
      </div>
    </Modal>
  );
}

export function StudentModal({ student, close, notify }) {
  return (
    <Modal
      title={`${student[0]} — contribution record`}
      subtitle={`${student[2]} · Individual evidence summary`}
      close={close}
      footer={
        <Button
          onClick={() => {
            notify("Individual report prepared for export");
            close();
          }}
        >
          <Icon name="download" /> Export record
        </Button>
      }
    >
      <div className="t-student-head">
        <Avatar initials={student[1]} />
        <div>
          <b>{student[0]}</b>
          <p>
            {student[4]} verified tasks · {student[5]} active contribution
          </p>
        </div>
        <strong>{student[3]}%</strong>
      </div>
      <div className="t-score-bars">
        {[
          ["Task completion", student[3]],
          ["Evidence quality", Math.min(student[3] + 4, 100)],
          ["Collaboration", Math.max(student[3] - 6, 0)],
        ].map(([label, score]) => (
          <label key={label}>
            <span>
              {label}
              <b>{score}%</b>
            </span>
            <Progress value={score} />
          </label>
        ))}
      </div>
      <div className="t-info">
        <Icon name="shield" />
        <p>
          This report is generated from accepted tasks, evidence, comments, and
          verified group activity.
        </p>
      </div>
    </Modal>
  );
}

export function InviteModal({ close, notify }) {
  const [email, setEmail] = useState("");
  return (
    <Modal
      title="Invite a co-lecturer"
      subtitle="Grant portfolio visibility to another authorized academic."
      close={close}
      footer={
        <>
          <Button kind="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!email.includes("@")}
            onClick={() => notify("Co-lecturer invitation sent")}
          >
            <Icon name="send" /> Send invitation
          </Button>
        </>
      }
    >
      <Field
        label="Institution email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        placeholder="colleague@university.edu"
      />
      <Field label="Access level">
        <select defaultValue="view">
          <option value="view">View and export reports</option>
          <option value="assess">Assess submissions</option>
          <option value="admin">Full portfolio access</option>
        </select>
      </Field>
    </Modal>
  );
}

export function ConfirmModal({ title, text, close, confirm, btnName }) {
  return (
    <Modal
      title={title}
      close={close}
      footer={
        <>
          <Button kind="secondary" onClick={close}>
            Cancel
          </Button>
          <Button kind="danger" onClick={confirm}>
            Archive {btnName}
          </Button>
        </>
      }
    >
      <div className="t-confirm">
        <span>
          <Icon name="alert" />
        </span>
        <p>{text}</p>
      </div>
    </Modal>
  );
}
