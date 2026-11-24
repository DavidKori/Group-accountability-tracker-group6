import { useMemo, useState } from "react";
import { LBadge, LButton, LIcon, PageTitle } from "../components/LeaderUI.jsx";

export default function ProjectsPage({
  memberships = [],
  selectedGroupId,
  onSelect,
}) {
  const [query, setQuery] = useState("");

  // Group memberships by project
  const byProject = useMemo(() => {
    const map = new Map();
    for (const m of memberships) {
      const key = String(m.projectId ?? m.projectTitle ?? "unassigned");
      if (!map.has(key)) {
        map.set(key, {
          projectId: m.projectId,
          projectTitle: m.projectTitle ?? "Unassigned project",
          projectCourse: m.projectCourse,
          deadline: m.deadline,
          groups: [],
        });
      }
      map.get(key).groups.push(m);
    }
    return Array.from(map.values());
  }, [memberships]);

  const filtered = useMemo(() => {
    if (!query.trim()) return byProject;
    const q = query.toLowerCase();
    return byProject
      .map((p) => ({
        ...p,
        groups: p.groups.filter(
          (g) =>
            (g.groupName ?? "").toLowerCase().includes(q) ||
            (p.projectTitle ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((p) => p.groups.length > 0);
  }, [byProject, query]);

  return (
    <>
      <PageTitle
        eyebrow="MY PROJECTS"
        title="Projects and groups"
        description="Switch between every project and group you belong to. The selected group drives all other pages."
      />

      <div className="l-toolbar" style={{ marginBottom: "14px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <LIcon
            name="search"
            size={16}
            style={{
              position: "absolute",
              top: "50%",
              left: 10,
              transform: "translateY(-50%)",
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects or groups..."
            style={{
              width: "100%",
              padding: "10px 12px 10px 34px",
              background: "#f7f6f9",
              border: "1px solid transparent",
              borderRadius: 9,
              outline: "none",
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="l-empty-copy">No projects match your search.</p>
      )}

      {filtered.map((project) => (
        <section
          key={project.projectId ?? project.projectTitle}
          className="l-card"
          style={{ marginBottom: "14px" }}
        >
          <div className="l-card-head">
            <div>
              <h2>{project.projectTitle}</h2>
              <p>
                {project.projectCourse ? `${project.projectCourse} · ` : ""}
                {project.groups.length} group
                {project.groups.length === 1 ? "" : "s"}
                {project.deadline
                  ? ` · due ${new Date(project.deadline).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
          </div>

          <div>
            {project.groups.map((g) => {
              const isCurrent = String(g.groupId) === String(selectedGroupId);
              return (
                <div
                  key={g.groupId}
                  className="l-toggle-row"
                  style={{ alignItems: "center", gap: "12px" }}
                >
                  <span>
                    <b>{g.groupName}</b>
                    <small>
                      {g.role === "leader"
                        ? "You lead this group"
                        : "You are a member"}
                      {g.memberCount ? ` · ${g.memberCount} members` : ""}
                    </small>
                  </span>
                  <LBadge tone={g.role === "leader" ? "green" : "blue"}>
                    {g.role === "leader" ? "LEADER" : "MEMBER"}
                  </LBadge>
                  {isCurrent ? (
                    <LBadge tone="green">CURRENT</LBadge>
                  ) : (
                    <LButton
                      kind="secondary"
                      onClick={() => onSelect(g.groupId)}
                    >
                      Switch to this group
                    </LButton>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
