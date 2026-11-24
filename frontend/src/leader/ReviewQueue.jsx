import { useMemo, useState } from "react";
import {
  LAvatar,
  LBadge,
  LButton,
  LIcon,
  LProgress,
  LSelect,
  PageTitle,
  Stat,
} from "../components/LeaderUI.jsx";

const initialsOf = (name) =>
  name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

const timeAgo = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const minutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

// Backend answer status -> label used by this page.
const reviewStatus = (answer) => {
  const raw = String(answer.status ?? "").toLowerCase();
  if (raw === "changes_requested" || raw === "revision")
    return "Revision required";
  if (raw === "assessed" || raw === "accepted" || answer.assessedAt)
    return "Accepted";
  return "Pending";
};

const fileName = (file) =>
  typeof file === "string"
    ? file
    : (file?.originalName ?? file?.name ?? file?.filename ?? "file");

// Convert a backend assessment answer into the shape this page renders.
const normalizeReview = (answer) => {
  const member = answer.user?.name ?? answer.member ?? "Unknown member";
  const title =
    answer.assessment?.title ??
    answer.title ??
    answer.task?.title ??
    "Submission";
  return {
    ...answer,
    id: answer._id ?? answer.id,
    title,
    member,
    initials: initialsOf(member),
    task: title,
    submitted: timeAgo(answer.submittedAt ?? answer.createdAt),
    files: (answer.files ?? answer.attachments ?? []).map(fileName),
    note: answer.note ?? answer.text ?? answer.comment ?? "No submission note.",
    status: reviewStatus(answer),
    version: answer.version ?? answer.attempt ?? 1,
  };
};

export default function ReviewsPage({ reviews: rawReviews, openModal }) {
  const [filter, setFilter] = useState("Pending");
  const reviews = useMemo(
    () => (Array.isArray(rawReviews) ? rawReviews : []).map(normalizeReview),
    [rawReviews],
  );
  const shown =
    filter === "All"
      ? reviews
      : reviews.filter((review) => review.status === filter);
  return (
    <>
      <PageTitle
        eyebrow="QUALITY CONTROL"
        title="Review queue"
        description="Inspect evidence, give useful feedback, and approve work before lecturer submission."
      >
        <LButton kind="secondary">
          <LIcon name="history" /> Review history
        </LButton>
      </PageTitle>
      <div className="l-review-stats">
        {[
          [
            "Pending",
            reviews.filter((item) => item.status === "Pending").length,
            "amber",
          ],
          [
            "Accepted",
            reviews.filter((item) => item.status === "Accepted").length,
            "green",
          ],
          [
            "Revision required",
            reviews.filter((item) => item.status === "Revision required")
              .length,
            "rose",
          ],
        ].map(([label, value, tone]) => (
          <button
            key={label}
            className={filter === label ? "active" : ""}
            onClick={() => setFilter(label)}
          >
            <span className={`tone-${tone}`}>
              <LIcon
                name={
                  label === "Pending"
                    ? "eye"
                    : label === "Accepted"
                      ? "check"
                      : "edit"
                }
              />
            </span>
            <b>{value}</b>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <section className="l-card">
        <div className="l-toolbar">
          <div className="l-filter-tabs">
            <button
              className={filter === "All" ? "active" : ""}
              onClick={() => setFilter("All")}
            >
              All submissions
            </button>
            <button
              className={filter === "Pending" ? "active" : ""}
              onClick={() => setFilter("Pending")}
            >
              Pending review
            </button>
          </div>
          <button>
            <LIcon name="filter" size={16} /> Sort: Newest
          </button>
        </div>
        <div className="l-submission-list">
          {shown.map((review) => (
            <article key={review.id}>
              <span className="l-file-icon">
                <LIcon name="file" />
              </span>
              <div className="l-submission-main">
                <div>
                  <LBadge
                    tone={
                      review.status === "Accepted"
                        ? "green"
                        : review.status === "Revision required"
                          ? "rose"
                          : "amber"
                    }
                  >
                    {review.status}
                  </LBadge>
                  <small>VERSION {review.version}</small>
                </div>
                <h2>{review.title}</h2>
                <p>{review.note}</p>
                <footer>
                  <span>
                    <LAvatar initials={review.initials} />
                    {review.member}
                  </span>
                  <span>
                    <LIcon name="calendar" size={14} />
                    {review.submitted}
                  </span>
                  <span>
                    <LIcon name="file" size={14} />
                    {review.files.length} files
                  </span>
                </footer>
              </div>
              <LButton onClick={() => openModal("review", review)}>
                {review.status === "Pending" ? "Review work" : "View decision"}{" "}
                <LIcon name="arrow" />
              </LButton>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
