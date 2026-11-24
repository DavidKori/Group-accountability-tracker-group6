import { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Field,
  Icon,
  Modal,
  SettingsHead,
  Toggle,
} from "../../components/LecturerUI.jsx";
import { useAssessment } from "../../context/assesmentContext.jsx";
import { useTask } from "../../context/taskContext.jsx";

const defaultForm = {
  taskId: "",
  title: "",
  description: "",
  opensAt: "",
  closesAt: "",
  requireIndividualEvidence: true,
  lockEditsAfterSubmission: true,
  allowLeaderResubmission: true,
  latePolicy: "flag",
  markingScale: "percentage",
  rubric: [
    {
      criterion: "Research and analysis",
      weight: 1,
      maxScore: 100,
      description: "",
    },
    {
      criterion: "Quality of evidence",
      weight: 1,
      maxScore: 100,
      description: "",
    },
    {
      criterion: "Final deliverable",
      weight: 1,
      maxScore: 100,
      description: "",
    },
    {
      criterion: "Team contribution",
      weight: 1,
      maxScore: 100,
      description: "",
    },
  ],
  recipients: [],
};

export default function AssessmentsSettings({ notify }) {
  const { tasks, fetchGroupsForTask } = useTask?.() ?? { tasks: [] };
  const {
    assessments,
    fetchAssessments,
    createAssessment,
    saveAssessmentChanges,
    deleteAssessment,
    loading,
  } = useAssessment();

  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Confirm-delete modal
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Assessments grouped by task (for the list)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const a of assessments) {
      const taskId = a.task?._id ?? a.task;
      if (!map.has(taskId)) {
        map.set(taskId, { task: a.task, items: [] });
      }
      map.get(taskId).items.push(a);
    }
    return Array.from(map.values());
  }, [assessments]);

  const resetForm = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setError("");
  };

  const startEdit = (assessment) => {
    setEditing(assessment);
    setForm({
      taskId: assessment.task?._id ?? assessment.task ?? "",
      title: assessment.title ?? "",
      description: assessment.description ?? "",
      opensAt: assessment.opensAt?.slice(0, 10) ?? "",
      closesAt: assessment.closesAt?.slice(0, 10) ?? "",
      requireIndividualEvidence: assessment.requireIndividualEvidence ?? true,
      lockEditsAfterSubmission: assessment.lockEditsAfterSubmission ?? true,
      allowLeaderResubmission: assessment.allowLeaderResubmission ?? true,
      latePolicy: assessment.latePolicy ?? "flag",
      markingScale: assessment.markingScale ?? "percentage",
      rubric: assessment.rubric?.length
        ? assessment.rubric
        : defaultForm.rubric,
      recipients: assessment.recipients ?? [],
    });
  };

  const change = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateRubric = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.map((r, i) =>
        i === index ? { ...r, [key]: value } : r,
      ),
    }));
  };

  const addRubricRow = () => {
    setForm((prev) => ({
      ...prev,
      rubric: [
        ...prev.rubric,
        { criterion: "", weight: 1, maxScore: 100, description: "" },
      ],
    }));
  };

  const removeRubricRow = (index) => {
    setForm((prev) => ({
      ...prev,
      rubric: prev.rubric.filter((_, i) => i !== index),
    }));
  };

  const toggleRecipient = (userId) => {
    setForm((prev) => ({
      ...prev,
      recipients: prev.recipients.includes(userId)
        ? prev.recipients.filter((id) => id !== userId)
        : [...prev.recipients, userId],
    }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.taskId) {
      setError("Choose a task first.");
      return;
    }
    if (!form.title.trim()) {
      setError("Assessment title is required.");
      return;
    }
    if (form.rubric.some((r) => !r.criterion.trim())) {
      setError("Every rubric row needs a criterion.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        rubric: form.rubric.map((r) => ({
          criterion: r.criterion.trim(),
          weight: Number(r.weight) || 1,
          maxScore: Number(r.maxScore) || 100,
          description: (r.description ?? "").trim(),
        })),
        opensAt: form.opensAt || null,
        closesAt: form.closesAt || null,
      };

      if (editing) {
        await saveAssessmentChanges(editing._id, payload);
        notify?.("Assessment updated");
      } else {
        await createAssessment(payload);
        notify?.("Assessment created and sent to recipients");
      }
      resetForm();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save assessment.",
      );
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (assessment) => setConfirmTarget(assessment);

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await deleteAssessment(confirmTarget._id);
      notify?.(`${confirmTarget.title} deleted`);
      if (editing?._id === confirmTarget._id) resetForm();
      setConfirmTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete assessment.");
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // Recipient candidates from the selected task's groups (if populated)
  const recipientCandidates = useMemo(() => {
    const selected = tasks?.find((t) => String(t._id) === String(form.taskId));
    if (!selected) return [];
    const pool = new Map();
    const groups = selected.groups ?? [];
    for (const g of groups) {
      if (g?.leader) pool.set(String(g.leader._id ?? g.leader), g.leader);
      for (const m of g.groupMembers ?? []) {
        pool.set(String(m._id ?? m), m);
      }
    }
    return Array.from(pool.values());
  }, [tasks, form.taskId]);

  return (
    <>
      <SettingsHead
        title="Assessment defaults"
        text="Create, edit, and publish assessments. Each task can have up to 5 assessments."
      />

      {error && <p className="t-error">{error}</p>}

      {loading && assessments.length === 0 && (
        <p className="t-member-empty">Loading assessments...</p>
      )}

      {grouped.map(({ task, items }) => (
        <div key={task?._id ?? task} className="t-assessment-group">
          <h3 className="t-section-label">
            {task?.title ?? "Task"} · {items.length}/5
          </h3>
          {items.map((assessment) => (
            <div className="t-setting-row" key={assessment._id}>
              <span>
                <b>{assessment.title}</b>
                <small>
                  {assessment.status}
                  {assessment.closesAt
                    ? ` · Due ${new Date(assessment.closesAt).toLocaleDateString()}`
                    : ""}
                  {` · ${assessment.recipients?.length ?? 0} recipients`}
                </small>
              </span>
              <Badge
                tone={
                  assessment.status === "assessed"
                    ? "blue"
                    : assessment.status === "draft"
                      ? "slate"
                      : "amber"
                }
              >
                {assessment.status.toUpperCase()}
              </Badge>
              <button onClick={() => startEdit(assessment)} aria-label="Edit">
                <Icon name="edit" />
              </button>
              <button onClick={() => askDelete(assessment)} aria-label="Delete">
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      ))}

      {assessments.length === 0 && !loading && (
        <p className="t-member-empty">No assessments yet. Create one below.</p>
      )}

      <div className="t-module-form">
        <h3 className="t-section-label">
          {editing ? `Edit ${editing.title}` : "Create an assessment"}
        </h3>

        <div className="t-form-grid">
          <Field
            label="Task"
            type="select"
            value={form.taskId}
            onChange={change("taskId")}
            placeholder="Choose a task"
            options={(tasks ?? []).map((t) => ({
              value: t._id,
              label: `${t.title} · ${t.course}`,
            }))}
          />
          <Field
            label="Assessment title"
            value={form.title}
            onChange={change("title")}
            placeholder="e.g. Final presentation rubric"
          />
          <Field
            label="Opens at"
            type="date"
            value={form.opensAt}
            onChange={change("opensAt")}
          />
          <Field
            label="Closes at"
            type="date"
            value={form.closesAt}
            onChange={change("closesAt")}
          />
          <Field
            label="Late policy"
            type="select"
            value={form.latePolicy}
            onChange={change("latePolicy")}
            options={["flag", "block"]}
          />
          <Field
            label="Marking scale"
            type="select"
            value={form.markingScale}
            onChange={change("markingScale")}
            options={["percentage", "letter"]}
          />
        </div>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={change("description")}
            placeholder="What students must submit..."
          />
        </Field>

        <div className="t-assessment-toggles">
          <Toggle
            label="Require individual evidence"
            text="Every submission must include at least one evidence file."
            checked={form.requireIndividualEvidence}
            onChange={change("requireIndividualEvidence")}
          />
          <Toggle
            label="Lock edits after submission"
            text="Students cannot change an answer once submitted."
            checked={form.lockEditsAfterSubmission}
            onChange={change("lockEditsAfterSubmission")}
          />
          <Toggle
            label="Allow leader resubmission"
            text="Group leaders may resubmit after feedback."
            checked={form.allowLeaderResubmission}
            onChange={change("allowLeaderResubmission")}
          />
        </div>

        <h4 className="t-section-label">Rubric</h4>
        <div className="t-rubric-editor">
          {form.rubric.map((row, index) => (
            <div className="t-rubric-row" key={index}>
              <input
                value={row.criterion}
                onChange={(e) =>
                  updateRubric(index, "criterion", e.target.value)
                }
                placeholder="Criterion"
              />
              <input
                type="number"
                value={row.weight}
                onChange={(e) => updateRubric(index, "weight", e.target.value)}
                placeholder="Weight"
              />
              <input
                type="number"
                value={row.maxScore}
                onChange={(e) =>
                  updateRubric(index, "maxScore", e.target.value)
                }
                placeholder="Max score"
              />
              <button
                type="button"
                onClick={() => removeRubricRow(index)}
                aria-label="Remove rubric row"
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <Button kind="secondary" onClick={addRubricRow}>
            <Icon name="plus" /> Add rubric row
          </Button>
        </div>

        {recipientCandidates.length > 0 && (
          <>
            <h4 className="t-section-label">
              Recipients · {form.recipients.length} selected
            </h4>
            <div className="t-member-list">
              {recipientCandidates.map((u) => {
                const checked = form.recipients.includes(u._id ?? u);
                return (
                  <label
                    key={u._id ?? u}
                    className={`t-member-option ${checked ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRecipient(u._id ?? u)}
                    />
                    <div className="t-member-info">
                      <strong>{u.name ?? "Unnamed"}</strong>
                      <small>{u.email ?? ""}</small>
                      <small>{u.studentId ?? ""}</small>
                    </div>
                    {checked && <span className="t-member-check">✓</span>}
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="t-module-actions">
          <Button onClick={handleSubmit} disabled={saving}>
            <Icon name={editing ? "check" : "plus"} />
            {saving
              ? "Saving..."
              : editing
                ? "Save changes"
                : "Create assessment"}
          </Button>
          {editing && (
            <Button kind="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {confirmTarget && (
        <Modal
          title="Delete assessment"
          subtitle={`This will delete ${confirmTarget.title} and all its answers.`}
          close={() => (deleting ? null : setConfirmTarget(null))}
          footer={
            <>
              <Button
                kind="secondary"
                onClick={() => setConfirmTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button kind="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete assessment"}
              </Button>
            </>
          }
        >
          <div className="t-confirm">
            <span>
              <Icon name="alert" />
            </span>
            <p>
              Deleting <b>{confirmTarget.title}</b> will also remove every
              student's answer. This cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
