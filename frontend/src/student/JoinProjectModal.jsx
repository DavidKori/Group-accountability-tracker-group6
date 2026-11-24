import { useState } from "react";
import { FormField, Icon, Modal } from "../components/AppUI.jsx";
import api from "../api/axios.js";

export default function JoinProjectModal({ close, join, onJoined }) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(null); // project data from backend
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findProject = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await api.get(
        `/projects/by-code/${encodeURIComponent(code.trim())}`,
      );
      const project = response?.data;
      if (!project?._id) {
        throw new Error("Project not found");
      }
      setPreview(project);
      // Auto-select when there's exactly one group
      if (project.groups?.length === 1) {
        setSelectedGroupId(project.groups[0]._id);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not find a project with that code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmJoin = async () => {
    if (!selectedGroupId) {
      setError("Choose a group to join.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/projects/join", {
        code: code.trim(),
        groupId: selectedGroupId,
      });
      const joined = response?.data?.group;

      // Hand the joined group back to the caller so they can refresh
      // their membership list and navigate into it.
      join?.(joined);
      onJoined?.(joined);
      close();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to join the project.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (preview) {
      confirmJoin();
    } else {
      findProject();
    }
  };

  return (
    <Modal
      title="Join a project"
      subtitle="Use the invitation code shared by your group leader."
      close={close}
      action={
        loading ? "Working..." : preview ? "Join this group" : "Find project"
      }
      onAction={handleAction}
      actionDisabled={!code || loading || (preview && !selectedGroupId)}
    >
      <FormField
        label="Project invitation code"
        placeholder="e.g. 8XQ2K7"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        disabled={Boolean(preview)}
      />

      {error && <p className="form-error">{error}</p>}

      {preview && (
        <>
          <div className="join-preview">
            <span className="project-mark mark-blue">
              <Icon name="projects" />
            </span>
            <div>
              <small>YOU ARE JOINING</small>
              <h3>{preview.title}</h3>
              <p>
                {preview.course || "No course"} ·{" "}
                {preview.lecturer?.name
                  ? `Led by ${preview.lecturer.name}`
                  : "Lecturer pending"}
                {preview.deadline
                  ? ` · due ${new Date(preview.deadline).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
            <Icon name="check" />
          </div>

          {preview.groups?.length === 0 && (
            <p className="form-error">
              This project has no groups yet. Ask your lecturer to set one up.
            </p>
          )}

          {preview.groups?.length > 0 && (
            <div className="form-stack" style={{ marginTop: 12 }}>
              <span className="field-label">Choose a group</span>
              {preview.groups.map((g) => (
                <label
                  key={g._id}
                  className="setting-row"
                  style={{ alignItems: "center", gap: 12, cursor: "pointer" }}
                >
                  <input
                    type="radio"
                    name="group"
                    value={g._id}
                    checked={selectedGroupId === g._id}
                    onChange={() => setSelectedGroupId(g._id)}
                  />
                  <span style={{ flex: 1 }}>
                    <b>{g.name}</b>
                    <small>
                      {g.leaderName
                        ? `Led by ${g.leaderName}`
                        : "No leader assigned"}
                      {g.memberCount
                        ? ` · ${g.memberCount} member${g.memberCount === 1 ? "" : "s"}`
                        : ""}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setPreview(null);
              setSelectedGroupId(null);
              setError("");
            }}
            style={{ marginTop: 8 }}
          >
            Use a different code
          </button>
        </>
      )}

      <div className="info-callout">
        <Icon name="shield" />
        <p>
          You can review the project and its groups before joining. A leader
          must assign tasks after you become a member.
        </p>
      </div>
    </Modal>
  );
}
