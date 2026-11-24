import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Field,
  Icon,
  SettingsHead,
} from "../../components/LecturerUI.jsx";
import { useModule } from "../../context/moduleContext.jsx";

export default function ModulesSettings({ notify }) {
  const {
    modules,
    fetchModules,
    createModule,
    saveModuleChanges,
    deleteModule,
    loading,
  } = useModule();

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    credits: 0,
    semester: "1",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm-modal state for deletion
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      description: "",
      credits: 0,
      semester: "1",
    });
    setError("");
  };

  const startEdit = (module) => {
    setEditing(module);
    setForm({
      code: module.code ?? "",
      name: module.name ?? "",
      description: module.description ?? "",
      credits: module.credits ?? 0,
      semester: module.semester ?? "1",
    });
  };

  const change = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.code.trim() || !form.name.trim()) {
      setError("Module code and name are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim(),
        credits: Number(form.credits) || 0,
        semester: form.semester,
      };

      if (editing) {
        await saveModuleChanges(editing._id, payload);
        notify?.("Module updated");
      } else {
        await createModule(payload);
        notify?.("Module created");
      }
      resetForm();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save module.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Ask via modal
  const askDelete = (module) => {
    setConfirmTarget(module);
  };

  // Confirm handler
  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    try {
      await deleteModule(confirmTarget._id);
      notify?.(`${confirmTarget.code} deleted`);
      if (editing?._id === confirmTarget._id) resetForm();
      setConfirmTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete module.");
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SettingsHead
        title="Active modules"
        text="Courses available when creating groups and main tasks."
      />

      {error && <p className="t-error">{error}</p>}

      {loading && modules.length === 0 && (
        <p className="t-member-empty">Loading modules...</p>
      )}

      {modules.map((module) => (
        <div className="t-setting-row" key={module._id}>
          <span>
            <b>
              {module.code} · {module.name}
            </b>
            <small>
              {module.credits || 0} credits · Semester {module.semester}
              {module.groups?.length
                ? ` · ${module.groups.length} active groups`
                : ""}
            </small>
          </span>
          <button onClick={() => startEdit(module)} aria-label="Edit module">
            <Icon name="edit" />
          </button>
          <button onClick={() => askDelete(module)} aria-label="Delete module">
            <Icon name="trash" />
          </button>
        </div>
      ))}

      {modules.length === 0 && !loading && (
        <p className="t-member-empty">No modules yet. Connect one below.</p>
      )}

      <div className="t-module-form">
        <h3 className="t-section-label">
          {editing ? `Edit ${editing.code}` : "Connect a module"}
        </h3>
        <div className="t-form-grid">
          <Field
            label="Module code"
            value={form.code}
            onChange={change("code")}
            placeholder="ENV 304"
          />
          <Field
            label="Module name"
            value={form.name}
            onChange={change("name")}
            placeholder="Sustainable Systems"
          />
          <Field
            label="Credits"
            type="number"
            value={form.credits}
            onChange={change("credits")}
          />
          <Field
            label="Semester"
            type="select"
            value={form.semester}
            onChange={change("semester")}
            options={["1", "2", "summer", "other"]}
          />
        </div>
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={change("description")}
            placeholder="Short module overview..."
          />
        </Field>
        <div className="t-module-actions">
          <Button onClick={handleSubmit} disabled={saving}>
            <Icon name={editing ? "check" : "plus"} />
            {saving ? "Saving..." : editing ? "Save changes" : "Connect module"}
          </Button>
          {editing && (
            <Button kind="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Confirm-delete modal */}
      {confirmTarget && (
        <Modal
          title="Delete module"
          subtitle={`This will remove ${confirmTarget.code} from the module list.`}
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
                {deleting ? "Deleting..." : "Delete module"}
              </Button>
            </>
          }
        >
          <div className="t-confirm">
            <span>
              <Icon name="alert" />
            </span>
            <p>
              Deleting{" "}
              <b>
                {confirmTarget.code} · {confirmTarget.name}
              </b>{" "}
              is permanent and will detach any groups currently linked to it. Do
              you want to continue?
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
