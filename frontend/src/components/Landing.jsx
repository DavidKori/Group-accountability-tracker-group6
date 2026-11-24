import { Badge, Button, Icon, Logo, Progress } from "./AppUI.jsx";
import "../styles/landing.css";
export default function Landing({ navigate }) {
  return (
    <div className="public-page">
      <div className="public-header">
        <header className="public-nav">
          <Logo />
          <nav>
            <a href="#features">Features</a>
            <a href="#roles">For teams</a>
            <a href="#workflow">How it works</a>
          </nav>
          <div>
            <Button variant="ghost" onClick={() => navigate("login")}>
              Log in
            </Button>
            <Button onClick={() => navigate("signup")}>Get started</Button>
          </div>
        </header>
      </div>
      <main>
        <section className="hero">
          <div className="hero-glow" />
          <Badge>FAIRER GROUP WORK STARTS HERE</Badge>
          <h1>
            Every contribution,
            <br />
            <em>clearly accounted for.</em>
          </h1>
          <p>
            Plan projects, complete assigned work, attach evidence, and create a
            transparent record that gives every team member fair credit.
          </p>
          <div className="hero-actions">
            <Button onClick={() => navigate("signup")}>
              Start tracking free <Icon name="arrow" />
            </Button>
            <Button variant="secondary" onClick={() => navigate("login")}>
              <Icon name="eye" /> Continue tracking...
            </Button>
          </div>
          <div className="product-preview">
            <aside>
              <Logo light />
              <span className="preview-nav active">Overview</span>
              <span className="preview-nav">Assigned tasks</span>
              <span className="preview-nav">Contribution record</span>
            </aside>
            <div className="preview-main">
              <p className="eyebrow">MEMBER WORKSPACE</p>
              <h3>Good morning, Alex</h3>
              <div className="preview-stats">
                <article>
                  <b>5</b>
                  <span>Tasks due</span>
                </article>
                <article>
                  <b>87%</b>
                  <span>Contribution score</span>
                </article>
                <article>
                  <b>3</b>
                  <span>Active projects</span>
                </article>
              </div>
              <div className="preview-chart">
                <div>
                  <b>Literature review</b>
                  <small>AI Ethics Research</small>
                </div>
                <Badge tone="amber">IN PROGRESS</Badge>
                <Progress value={68} />
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="features-section">
          <div className="section-heading">
            <span>FEATURES</span>
            <h2>Everything you need to track contributions.</h2>
            <p>
              The platform provides a clear workflow for members, while leaders
              and lecturers can monitor progress and review work.
            </p>
          </div>
          <div className="feature-cards">
            {[
              [
                "Accept & assign work",
                "Students accept assigned tasks, while leaders and lecturers can create and assign",
                "tasks",
              ],
              [
                "Track & evidence",
                "Members track their work, attach evidence, and submit for review.",
                "check",
              ],
              [
                "Invite & collaborate",
                "Leaders can invite members to collaborate on tasks and manage group members.",
                "users",
              ],
            ].map((item) => (
              <article key={item[0]}>
                <span className="feature-icon">
                  <Icon name={item[2]} />
                </span>
                <h3>{item[0]}</h3>
                <p>{item[1]}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="cta-section">
          <div className="cta-content">
            <h2>Start tracking contributions today.</h2>
            <p>
              Create a free account and start tracking your contributions to
              group work. No credit card required.
            </p>
            <Button onClick={() => navigate("signup")}>
              Get started free <Icon name="arrow" />
            </Button>
          </div>
        </section>
        <section id="roles" className="roles-section">
          <div className="section-heading">
            <span>BUILT FOR EVERY ROLE</span>
            <h2>One platform. Three focused experiences.</h2>
            <p>
              Each workspace presents the right tools, information, and controls
              for the person using it.
            </p>
          </div>
          <div className="role-cards">
            {[
              [
                "Member",
                "Complete meaningful work",
                "Accept assignments, draft work, attach evidence, collaborate, and build a verified contribution record.",
                "tasks",
              ],
              [
                "Group leader",
                "Coordinate with clarity",
                "Create tasks, balance workloads, review submissions, manage members, and prepare project delivery.",
                "users",
              ],
              [
                "Lecturer",
                "Assess with confidence",
                "Create groups, assign main tasks, inspect evidence, monitor activity, and export fair reports.",
                "chart",
              ],
            ].map((item) => (
              <article key={item[0]}>
                <span className="feature-icon">
                  <Icon name={item[3]} />
                </span>
                <small>{item[0]}</small>
                <h3>{item[1]}</h3>
                <p>{item[2]}</p>
                <button onClick={() => navigate("signup")}>
                  Explore workspace <Icon name="arrow" size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>
        <section id="workflow" className="workflow-section">
          <div className="section-heading">
            <span>HOW IT WORKS</span>
            <h2>Track contributions in three simple steps.</h2>
            <p>
              The platform guides members through a clear workflow, while
              leaders and lecturers can monitor progress and review work.
            </p>
          </div>
          <div className="workflow-steps">
            {[
              [
                "Create tasks",
                "Leaders and lecturers create tasks with clear instructions, deadlines, and attached resources.",
                "tasks",
              ],
              [
                "Complete work",
                "Members complete assigned tasks, attach evidence, and submit for review.",
                "check",
              ],
              [
                "Review & report",
                "Leaders and lecturers review submissions, provide feedback, and export contribution reports.",
                "chart",
              ],
            ].map((item) => (
              <article key={item[0]}>
                <span className="feature-icon">
                  <Icon name={item[2]} />
                </span>
                <h3>{item[0]}</h3>
                <p>{item[1]}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <Logo />
        <span>© 2025 Contribu · Transparent teamwork, fairly measured.</span>
      </footer>
    </div>
  );
}
