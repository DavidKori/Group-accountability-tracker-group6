import { useState } from "react";
import { Button, Icon, PageHeader } from "../components/AppUI.jsx";
import ActivityTimeline, { useActivityEntries } from "./ActivityTimeline.jsx";

const RANGE_DAYS = 30;

export default function ActivityPage() {
  const [filter, setFilter] = useState("All activity");
  const entries = useActivityEntries(filter, RANGE_DAYS);
  const todayCount = entries.filter((entry) => entry.today).length;
  const earlierCount = entries.length - todayCount;

  // Download the entries currently shown as a CSV file
  const exportActivity = () => {
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Date", "Activity", "Details"],
      ...entries.map((entry) => [
        entry.at.toLocaleString(),
        entry.title,
        entry.subtitle,
      ]),
    ];
    const csv = rows.map((row) => row.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-activity.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="AUDIT TRAIL"
        title="Project activity"
        description="A transparent timeline of assignments, updates, feedback, evidence, and submissions."
        actions={
          <Button
            variant="secondary"
            onClick={exportActivity}
            disabled={!entries.length}
          >
            <Icon name="download" /> Export my activity
          </Button>
        }
      />
      <section className="card">
        <div className="toolbar">
          <div className="filter-tabs">
            {["All activity", "My activity", "Feedback", "Evidence"].map(
              (item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <label className="date-filter">
            <Icon name="calendar" /> Last {RANGE_DAYS} days
          </label>
        </div>
        {!entries.length && (
          <ActivityTimeline filter={filter} days={RANGE_DAYS} />
        )}
        {todayCount > 0 && (
          <>
            <div className="activity-date">
              <span>Today</span>
            </div>
            <ActivityTimeline scope="today" filter={filter} days={RANGE_DAYS} />
          </>
        )}
        {earlierCount > 0 && (
          <>
            <div className="activity-date">
              <span>Earlier</span>
            </div>
            <ActivityTimeline
              scope="earlier"
              filter={filter}
              days={RANGE_DAYS}
            />
          </>
        )}
      </section>
    </>
  );
}
