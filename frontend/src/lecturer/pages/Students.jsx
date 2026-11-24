import { useMemo, useState, useEffect } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Icon,
  Modal,
  PageTitle,
} from "../../components/LecturerUI.jsx";
import { useUser } from "../../context/userContext.jsx";
import api from "../../api/axios.js";
import "../../styles/students.css";

const emptyForm = {
  name: "",
  email: "",
  studentId: "",
  password: "",
  role: "member",
  department: "",
  isActive: true,
};

export default function StudentsPage({ notify }) {
  const {
    users,
    setUsers,
    students,
    setStudents,
    leaders,
    setLeaders,
    loading,
    setLoading,
  } = useUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // All non-lecturer users; use `students` from context when available
  const roster = useMemo(() => {
    const source =
      Array.isArray(students) && students.length
        ? students
        : (Array.isArray(users) ? users : []).filter(
            (u) => u.role !== "lecturer",
          );
    return source;
  }, [students, users]);

  const syncContextLists = (nextRoster) => {
    setStudents?.(nextRoster);
    setLeaders?.(nextRoster.filter((u) => u.role === "leader"));
  };

  const filtered = useMemo(() => {
    let list = [...roster];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.studentId?.toString().toLowerCase().includes(q),
      );
    }

    if (roleFilter !== "All") list = list.filter((s) => s.role === roleFilter);

    if (statusFilter !== "All") {
      list = list.filter((s) =>
        statusFilter === "Active" ? s.isActive !== false : s.isActive === false,
      );
    }

    list.sort((a, b) => {
      if (sortBy === "name") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortBy === "role") return (a.role ?? "").localeCompare(b.role ?? "");
      if (sortBy === "recent")
        return new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0);
      return 0;
    });

    return list;
  }, [roster, search, roleFilter, statusFilter, sortBy]);

  const counts = useMemo(
    () => ({
      all: roster.length,
      leaders: roster.filter((s) => s.role === "leader").length,
      members: roster.filter((s) => s.role === "member").length,
      inactive: roster.filter((s) => s.isActive === false).length,
    }),
    [roster],
  );

  // Keep context in sync when roster changes (e.g. from workspace fetch)
  useEffect(() => {
    if (roster.length) syncContextLists(roster);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster.length]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      name: student.name ?? "",
      email: student.email ?? "",
      studentId: student.studentId ?? "",
      password: "",
      role: student.role ?? "member",
      department: student.department ?? "",
      isActive: student.isActive !== false,
    });
    setFormError("");
    setFormOpen(true);
  };

  const change = (key, type) => (e) => {
    const value = type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitForm = async () => {
    setFormError("");
    if (!form.name.trim()) return setFormError("Name is required.");
    if (!form.email.includes("@")) return setFormError("Valid email required.");
    if (!form.studentId.trim()) return setFormError("Student ID is required.");
    if (!editing && form.password.length < 6)
      return setFormError("Password must be at least 6 characters.");

    setSaving(true);
    try {
      if (editing) {
        const updates = {
          name: form.name.trim(),
          studentId: form.studentId.trim(),
          role: form.role,
          department: form.department.trim(),
          isActive: form.isActive,
        };
        const response = await api.put(`/users/${editing._id}`, updates);
        const updated = response?.data ?? null;

        if (updated) {
          const nextRoster = roster.map((s) =>
            s._id === editing._id ? updated : s,
          );
          syncContextLists(nextRoster);
          setUsers?.((prev) =>
            Array.isArray(prev)
              ? prev.map((u) => (u._id === editing._id ? updated : u))
              : prev,
          );
        }
        notify?.("Student updated");
      } else {
        const response = await api.post("/auth/register", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          studentId: form.studentId.trim(),
          password: form.password,
          role: form.role,
          department: form.department.trim(),
        });
        const created = response?.data ?? null;

        if (created) {
          const nextRoster = [created, ...roster];
          syncContextLists(nextRoster);
          setUsers?.((prev) =>
            Array.isArray(prev) ? [created, ...prev] : [created],
          );
        }
        notify?.("Student created");
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(
        err.response?.data?.message || err.message || "Failed to save student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/users/${confirmTarget._id}`);
      const nextRoster = roster.filter((s) => s._id !== confirmTarget._id);
      syncContextLists(nextRoster);
      setUsers?.((prev) =>
        Array.isArray(prev)
          ? prev.filter((u) => u._id !== confirmTarget._id)
          : prev,
      );
      notify?.(`${confirmTarget.name} deleted`);
      setConfirmTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete student.");
      setConfirmTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="COHORT MANAGEMENT"
        title="Students"
        description="Manage members and group leaders across all your modules."
      >
        <Button onClick={openCreate}>
          <Icon name="plus" /> Add student
        </Button>
      </PageTitle>

      {error && <p className="t-error">{error}</p>}

      <div className="t-student-summary">
        {[
          [
            "All",
            counts.all,
            () => {
              setRoleFilter("All");
              setStatusFilter("All");
            },
          ],
          [
            "Leaders",
            counts.leaders,
            () => {
              setRoleFilter("leader");
              setStatusFilter("All");
            },
          ],
          [
            "Members",
            counts.members,
            () => {
              setRoleFilter("member");
              setStatusFilter("All");
            },
          ],
          [
            "Inactive",
            counts.inactive,
            () => {
              setStatusFilter("Inactive");
            },
          ],
        ].map(([label, count, handler]) => {
          const active =
            (label === "All" &&
              roleFilter === "All" &&
              statusFilter === "All") ||
            (label === "Leaders" && roleFilter === "leader") ||
            (label === "Members" && roleFilter === "member") ||
            (label === "Inactive" && statusFilter === "Inactive");
          return (
            <button
              key={label}
              className={active ? "active" : ""}
              onClick={handler}
            >
              <b>{count}</b>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <section className="t-card">
        <div className="t-students-toolbar">
          <label className="t-search">
            <Icon name="search" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or student ID..."
            />
          </label>
          <Field
            label="Role"
            type="select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={["All", "leader", "member"]}
          />
          <Field
            label="Status"
            type="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={["All", "Active", "Inactive"]}
          />
          <Field
            label="Sort"
            type="select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={["name", "role", "recent"]}
          />
        </div>

        <div className="t-table-scroll">
          <div className="t-student-table t-table-head">
            <span>Student</span>
            <span>Student ID</span>
            <span>Role</span>
            <span>Department</span>
            <span>Status</span>
            <span />
          </div>

          {loading && filtered.length === 0 && (
            <p className="t-member-empty">Loading students...</p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="t-member-empty">No students match your filters.</p>
          )}

          {filtered.map((s) => (
            <div className="t-student-table" key={s._id}>
              <span>
                <Avatar
                  initials={
                    s.name
                      ? s.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "?"
                  }
                />
                <span>
                  <b>{s.name}</b>
                  <small>{s.email}</small>
                </span>
              </span>
              <span>{s.studentId}</span>
              <span>
                <Badge tone={s.role === "leader" ? "blue" : "slate"}>
                  {s.role?.toUpperCase() ?? "MEMBER"}
                </Badge>
              </span>
              <span>{s.department || "—"}</span>
              <span>
                <Badge tone={s.isActive === false ? "rose" : "blue"}>
                  {s.isActive === false ? "INACTIVE" : "ACTIVE"}
                </Badge>
              </span>
              <span>
                <button onClick={() => openEdit(s)} aria-label="Edit student">
                  <Icon name="edit" size={16} />
                </button>
                <button
                  onClick={() => setConfirmTarget(s)}
                  aria-label="Delete student"
                >
                  <Icon name="trash" size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>

      {formOpen && (
        <Modal
          title={editing ? `Edit ${editing.name}` : "Add student"}
          subtitle={
            editing
              ? "Update student details. Email and password cannot be changed here."
              : "Create a new student account."
          }
          close={() => (saving ? null : setFormOpen(false))}
          footer={
            <>
              <Button
                kind="secondary"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={saving}>
                <Icon name="check" />
                {saving
                  ? "Saving..."
                  : editing
                    ? "Save changes"
                    : "Add student"}
              </Button>
            </>
          }
        >
          {formError && <p className="t-error">{formError}</p>}
          <div className="t-form-grid">
            <Field label="Full name">
              <input
                value={form.name}
                onChange={change("name")}
                placeholder="Mary Jane Watson"
              />
            </Field>
            <Field label="Email">
              <input
                value={form.email}
                onChange={change("email")}
                type="email"
                placeholder="student@university.edu"
                disabled={!!editing}
              />
            </Field>
            <Field label="Student ID">
              <input
                value={form.studentId}
                onChange={change("studentId")}
                placeholder="e.g. 2024-ENV-042"
              />
            </Field>
            {!editing && (
              <Field label="Initial password">
                <input
                  value={form.password}
                  onChange={change("password")}
                  type="password"
                  placeholder="At least 6 characters"
                />
              </Field>
            )}
            <Field
              label="Role"
              type="select"
              value={form.role}
              onChange={change("role")}
              options={["member", "leader"]}
            />
            <Field label="Department">
              <input
                value={form.department}
                onChange={change("department")}
                placeholder="School of Pure & Applied Science"
              />
            </Field>
          </div>
          {editing && (
            <label className="t-toggle-line">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={change("isActive", "checkbox")}
              />
              Account is active
            </label>
          )}
        </Modal>
      )}

      {confirmTarget && (
        <Modal
          title="Delete student"
          subtitle={`This will permanently remove ${confirmTarget.name}.`}
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
                {deleting ? "Deleting..." : "Delete student"}
              </Button>
            </>
          }
        >
          <div className="t-confirm">
            <span>
              <Icon name="alert" />
            </span>
            <p>
              Deleting <b>{confirmTarget.name}</b> will remove their account,
              project memberships, and submissions. This cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
