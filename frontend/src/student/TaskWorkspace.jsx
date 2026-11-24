import { useEffect, useRef, useState } from "react";
import { Avatar, Badge, Button, Icon, Modal } from "../components/AppUI.jsx";
import api from "../api/axios.js";
import { useUser } from "../context/userContext.jsx";

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const formatStamp = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
};

// Drafts are not stored by the backend; keep them on this device per task.
const draftKey = (task) => `contribu:draft:${task._id ?? task.id}`;
const readDraft = (task) => {
  try {
    return window.localStorage.getItem(draftKey(task)) ?? task.draft ?? "";
  } catch {
    return task.draft ?? "";
  }
};
const writeDraft = (task, value) => {
  try {
    window.localStorage.setItem(draftKey(task), value);
  } catch {
    /* storage unavailable: draft stays in memory only */
  }
};

export default function TaskWorkspace({ task, updateTask, close, notify }) {
  const { user } = useUser();
  const [tab, setTab] = useState("Work area");
  const [draft, setDraft] = useState(() => readDraft(task));
  const [files, setFiles] = useState(task.evidence || []);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const editorRef = useRef(null);
  const assignedBy = task.assignedBy || "your group leader";
  const acceptedExtensions =
    ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip";

  // Comments live on the backend: GET /comments/task/:taskId
  const loadComments = async () => {
    try {
      const { data } = await api.get(`/comments/task/${task._id ?? task.id}`);
      const list = Array.isArray(data)
        ? data
        : (data?.comments ?? data?.data ?? []);
      setComments(Array.isArray(list) ? list : []);
    } catch (err) {
      //console.error("comments:", err);
      setComments([]);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task._id]);

  const postComment = async () => {
    try {
      await api.post("/comments", {
        task: task._id ?? task.id,
        text: comment,
      });
      setComment("");
      await loadComments();
      notify("Comment posted");
    } catch (err) {
      //console.error("post comment:", err);
      notify("Failed to post comment");
    }
  };

  // History built from the dates the backend records on the task
  const history = [];
  if (task.createdAt)
    history.push([
      "Task assigned to you",
      `${task.assignedBy || "Group leader"} · ${formatStamp(task.createdAt)}`,
    ]);
  if (task.completedAt) {
    history.push(["Task completed", formatStamp(task.completedAt)]);
  } else {
    history.push([
      `Current status: ${task.status}`,
      task.updatedAt ? formatStamp(task.updatedAt) : "Now",
    ]);
  }

  const acceptTask = () => {
    const changed = {
      ...task,
      accepted: true,
      status: "In progress",
      progress: 5,
    };
    updateTask(changed);
    notify("Task accepted. Your work is now being tracked.");
  };
  const handleFiles = (event) => {
    const incoming = Array.from(event.target.files || []);
    if (incoming.length + files.length > 5) {
      setError("You can attach a maximum of 5 documents per upload.");
      return;
    }
    if (incoming.some((file) => file.size > 20 * 1024 * 1024)) {
      setError("Each document must be 20 MB or smaller.");
      return;
    }
    setFiles((current) => [...current, ...incoming.map((file) => file.name)]);
    setError("");
  };
  const saveDraft = () => {
    const value = editorRef.current?.innerHTML || draft;
    setDraft(value);
    writeDraft(task, value);
    updateTask({
      ...task,
      draft: value,
      evidence: files,
      progress: Math.max(task.progress, 70),
      status: "In progress",
    });
    notify("Draft and evidence saved");
  };
  const submit = () => {
    if (!draft && !editorRef.current?.innerText) {
      setError("Add work in the editor before submitting.");
      return;
    }
    const value = editorRef.current?.innerHTML || draft;
    writeDraft(task, value);
    updateTask({
      ...task,
      draft: value,
      evidence: files,
      progress: 100,
      status: "In review",
    });
    notify("Work submitted to your group leader");
    close();
  };
  return (
    <Modal
      title={task.title}
      subtitle={`${task.project}${task.code ? ` · ${task.code}` : ""} · Due ${task.due}`}
      close={close}
      wide
    >
      {!task.accepted ? (
        <div className="assignment-accept">
          <span>
            <Icon name="tasks" size={30} />
          </span>
          <h3>You have been assigned this task</h3>
          <p>
            Review the requirements before accepting. Once accepted, activity
            and time spent will become part of your contribution record.
          </p>
          <div className="brief-box">
            <b>Task brief</b>
            <p>{task.description}</p>
            <div>
              <span>
                Assigned by <strong>{assignedBy}</strong>
              </span>
              <span>
                Priority <strong>{task.priority}</strong>
              </span>
            </div>
          </div>
          <div className="accept-actions">
            <Button variant="secondary" onClick={close}>
              Decline with reason
            </Button>
            <Button onClick={acceptTask}>
              <Icon name="check" /> Accept task
            </Button>
          </div>
        </div>
      ) : (
        <div className="task-workspace">
          <div className="modal-tabs">
            {["Work area", "Evidence", "Comments", "History"].map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
              >
                {item}
                {item === "Evidence" && ` (${files.length})`}
              </button>
            ))}
          </div>
          {tab === "Work area" && (
            <div className="work-area">
              <div className="task-brief-inline">
                <Badge tone="amber">{task.status}</Badge>
                <p>{task.description}</p>
              </div>
              <label className="field-label">
                Write your work directly in this task
              </label>
              <div className="editor-shell">
                <div className="editor-toolbar">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand("bold");
                    }}
                  >
                    <b>B</b>
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand("italic");
                    }}
                  >
                    <i>I</i>
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand("underline");
                    }}
                  >
                    <u>U</u>
                  </button>
                  <span />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand("insertUnorderedList");
                    }}
                  >
                    • List
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand("insertOrderedList");
                    }}
                  >
                    1. List
                  </button>
                </div>
                <div
                  ref={editorRef}
                  className="rich-editor"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: draft }}
                  data-placeholder="Start writing your response, notes, analysis, or final work here..."
                />
              </div>
              <p className="editor-note">
                <Icon name="shield" size={14} /> Drafts are private to you until
                you submit. Autosaved locally.
              </p>
              <div className="task-actions">
                <Button variant="secondary" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button onClick={submit}>
                  <Icon name="send" /> Submit for review
                </Button>
              </div>
            </div>
          )}
          {tab === "Evidence" && (
            <div>
              <div className="upload-zone">
                <Icon name="upload" size={34} />
                <h3>Upload supporting evidence</h3>
                <p>
                  PDF, Office documents, text, images, CSV, or ZIP · Maximum 20
                  MB each · Up to 5 files
                </p>
                <label className="button button-secondary">
                  Choose documents
                  <input
                    type="file"
                    multiple
                    accept={acceptedExtensions}
                    onChange={handleFiles}
                    hidden
                  />
                </label>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="evidence-list">
                {files.map((file, index) => (
                  <div key={`${file}-${index}`}>
                    <span>
                      <Icon name="file" />
                    </span>
                    <div>
                      <b>{file}</b>
                      <small>Attached to this task</small>
                    </div>
                    <button
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="task-actions">
                <Button variant="secondary" onClick={saveDraft}>
                  Save evidence
                </Button>
                <Button onClick={() => setTab("Work area")}>
                  Continue working <Icon name="arrow" />
                </Button>
              </div>
            </div>
          )}
          {tab === "Comments" && (
            <div className="comments-panel">
              {comments.map((item) => {
                const mine =
                  String(item.user?._id ?? item.user) === String(user?._id);
                const author = mine
                  ? "You"
                  : (item.user?.name ?? "Team member");
                return (
                  <div className="comment" key={item._id}>
                    <Avatar
                      initials={initialsOf(item.user?.name ?? user?.name)}
                      color={mine ? undefined : "indigo"}
                    />
                    <div>
                      <b>{author}</b>
                      <p>{item.text ?? item.body ?? item.content}</p>
                      <time>{formatStamp(item.createdAt)}</time>
                    </div>
                  </div>
                );
              })}
              {!comments.length && (
                <div className="empty-state">
                  <Icon name="message" size={30} />
                  <h3>No comments yet</h3>
                  <p>Ask a question or share an update with your group.</p>
                </div>
              )}
              <div className="comment-box">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Ask a question or share an update..."
                />
                <Button onClick={postComment} disabled={!comment.trim()}>
                  <Icon name="send" /> Comment
                </Button>
              </div>
            </div>
          )}
          {tab === "History" && (
            <div className="history-list">
              {history.map((item, index) => (
                <div key={item[0]}>
                  <i
                    className={index === history.length - 1 ? "current" : ""}
                  />
                  <span>
                    <b>{item[0]}</b>
                    <small>{item[1]}</small>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
