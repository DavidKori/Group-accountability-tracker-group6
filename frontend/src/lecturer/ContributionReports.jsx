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
// import { students } from "./data.js"
import { useGroup } from "../context/groupContext.jsx";

export default function ReportsPage({ open, exportReport }) {
  const {
    groups,
    setGroups,
    group,
    setGroup,
    selectedGroup,
    setSelectedGroup,
    updateGroup,
    clearGroup,
    loading,
    setLoading,
  } = useGroup();

  const average = useMemo(() => {
    if (!groups?.length) return 0;
    return Math.round(
      groups.reduce((sum, group) => sum + (group.progress ?? 0), 0) /
        groups.length,
    );
  }, [groups]);

  return (
    <>
      <PageTitle
        eyebrow="EVIDENCE-BASED OVERSIGHT"
        title="Contribution reports"
        description="Compare participation patterns and investigate exceptions before final grading."
      >
        <Button kind="secondary" onClick={() => exportReport("Contribution")}>
          <Icon name="download" /> Export report
        </Button>
      </PageTitle>
      <section className="t-report-hero">
        <div>
          <small>PORTFOLIO COMPLETION</small>
          <b>{average}%</b>
          <p>Average project progress across {groups.length} active groups</p>
        </div>
        <div className="t-report-kpis">
          <span>
            <b>87%</b>
            <small>Average participation</small>
          </span>
          <span>
            <b>64</b>
            <small>Verified contributions</small>
          </span>
          <span>
            <b>5</b>
            <small>Open evidence reviews</small>
          </span>
        </div>
        <div className="t-ring" style={{ "--score": `${average * 3.6}deg` }}>
          <span>
            <b>{average}</b>
            <small>PORTFOLIO</small>
          </span>
        </div>
      </section>
      <div className="t-report-grid">
        <section className="t-card">
          <div className="t-card-head">
            <div>
              <h2>Contribution distribution</h2>
              <p>Highest and lowest participation signals</p>
            </div>
            <Badge>LIVE DATA</Badge>
          </div>
          <div className="t-student-chart">
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => {
                  setSelectedGroup(group);
                  setGroup(group);
                  open("groupDetail", group);
                }}
              >
                <Avatar
                  initials={(group.name ?? "?").slice(0, 2).toUpperCase()}
                />
                <span>
                  <b>{group.name}</b>
                  <small>
                    {group.members ?? 0} members · {group.task ?? "No task"}
                  </small>
                  <Progress value={group.progress ?? 0} />
                </span>
                <strong>{group.progress ?? 0}%</strong>
              </button>
            ))}
          </div>
        </section>
        <section className="t-card">
          <div className="t-card-head">
            <div>
              <h2>Evidence quality</h2>
              <p>Portfolio-wide verification</p>
            </div>
          </div>
          <div className="t-donut">
            <div>
              <span>
                <b>91%</b>
                <small>verified</small>
              </span>
            </div>
            <ul>
              <li>
                <i className="blue" /> Accepted evidence <b>64</b>
              </li>
              <li>
                <i className="navy" /> Awaiting review <b>5</b>
              </li>
              <li>
                <i className="gray" /> Revision requested <b>3</b>
              </li>
            </ul>
          </div>
        </section>
      </div>
      <section className="t-card t-report-groups">
        <div className="t-card-head">
          <div>
            <h2>Group comparison</h2>
            <p>Progress and participation at a glance</p>
          </div>
        </div>
        {groups.map((group) => (
          <button
            key={group._id}
            onClick={() => {
              setSelectedGroup(group);
              setGroup(group);
              open("groupDetail", group);
            }}
          >
            <span className="t-group-mark">
              {(group.name ?? "??").slice(0, 2).toUpperCase()}
            </span>
            <span>
              <b>{group.name}</b>
              <small>
                {group.members ?? 0} members · {group.task ?? "No task"}
              </small>
            </span>
            <span>
              <Progress value={group.progress ?? 0} />
              <small>{group.progress ?? 0}% project progress</small>
            </span>
            <Badge tone={group.flagged ? "amber" : "blue"}>
              {group.flagged ? "CHECK" : "BALANCED"}
            </Badge>
            <Icon name="arrow" size={15} />
          </button>
        ))}
      </section>
    </>
  );
}
