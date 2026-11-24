import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  Icon,
  PageTitle,
  Progress,
  SettingsHead,
  Stat,
  Toggle,
} from "../components/LecturerUI.jsx";
// import { students } from "./data.js";
import { useSubmission } from "../context/submissionContext.jsx";

export default function SubmissionsPage({ open }) {
  const {
    submissions,
    setSubmissions,
    submission,
    setSubmission,
    selectedSubmission,
    setSelectedSubmission,
    updateSubmission,
    clearSubmission,
    loading,
    setLoading,
  } = useSubmission();

  const [filter, setFilter] = useState("All");

  const shown = useMemo(() => {
    if (filter === "All") return submissions;
    return submissions.filter((item) => item.status === filter);
  }, [submissions, filter]);

  return (
    <>
      <PageTitle
        eyebrow="ASSESSMENT WORKSPACE"
        title="Group submissions"
        description="Inspect final deliverables alongside task history, evidence, and individual contribution."
      >
        <Button kind="secondary" onClick={() => window.print()}>
          <Icon name="download" /> Print Submission sheet
        </Button>
      </PageTitle>
      <div className="t-submission-tabs">
        {["All", "Ready to assess", "Changes requested", "Assessed"].map(
          (item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
              <b>
                {item === "All"
                  ? submissions.length
                  : submissions.filter(
                      (submission) => submission.status === item,
                    ).length}
              </b>
            </button>
          ),
        )}
      </div>
      <section className="t-card t-submission-list">
        {shown.map((item) => (
          <article key={item._id}>
            <span className="t-file-mark">
              <Icon name="file" />
            </span>
            <div>
              <div>
                <Badge
                  tone={
                    item.status === "Assessed"
                      ? "blue"
                      : item.status === "Changes requested"
                        ? "amber"
                        : "slate"
                  }
                >
                  {item.status}
                </Badge>
                <small>{item.submitted}</small>
              </div>
              <h2>{item.group}</h2>
              <p>{item.task}</p>
              <footer>
                <span>
                  <Icon name="users" size={14} /> Led by {item.leader}
                </span>
                <span>
                  <Icon name="file" size={14} /> {item.files} evidence files
                </span>
                {item.score && (
                  <span>
                    <Icon name="check" size={14} /> Score: {item.score}%
                  </span>
                )}
              </footer>
            </div>
            <Button
              kind={item.status === "Assessed" ? "secondary" : "primary"}
              onClick={() => {
                setSelectedSubmission(item);
                setSubmission(item);
                open("submission", item);
              }}
            >
              {item.status === "Assessed"
                ? "Review assessment"
                : "Open submission"}{" "}
              <Icon name="arrow" size={15} />
            </Button>
          </article>
        ))}
      </section>
    </>
  );
}
