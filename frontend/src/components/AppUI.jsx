import { useState } from "react";
import { useUser } from "../context/userContext.jsx";
import { useNotification } from "../context/notificationContext.jsx";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

//
const iconPaths = {
  home: (
    <>
      <path d="m3 11 9-8 9 8v10h-6v-6H9v6H3z" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 9 1.5 1.5L12 8M14 10h3M8 15h9" />
    </>
  ),
  projects: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3a8 8 0 0 0-1.7 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  upload: (
    <>
      <path d="M12 16V4m0 0L8 8m4-4 4 4M4 20h16" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 13h6M9 17h6" />
    </>
  ),
  message: (
    <path d="M20 15a3 3 0 0 1-3 3H8l-5 3V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3z" />
  ),
  users: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-6A3.5 3.5 0 0 0 3 18.5V20" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M21 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  logout: (
    <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

export function Logo({ light = false }) {
  return (
    <div className={`logo ${light ? "logo-light" : ""}`}>
      <span className="logo-mark">
        {/* <Icon name="check" /> */}
        <img
          src={import.meta.env.BASE_URL + "public/favicon.jpg"}
          alt="logo"
          width="34"
          height="34"
          style={{ borderRadius: "50%" }}
        />
      </span>
      <span>Contribu</span>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  className = "",
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button button-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

export function Avatar({ initials, color = "teal" }) {
  return <span className={`avatar avatar-${color}`}>{initials}</span>;
}

export function Badge({ children, tone = "teal" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Progress({ value, tone = "teal" }) {
  return (
    <div className="progress">
      <span
        className={`progress-fill progress-${tone}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  close,
  action,
  onAction,
  wide = false,
  actionDisabled = false,
}) {
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {action && (
          <footer className="modal-footer">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={onAction || close} disabled={actionDisabled}>
              {action}
            </Button>
          </footer>
        )}
      </section>
    </div>
  );
}

export function Toast({ message }) {
  return (
    <div className="toast">
      <span>
        <Icon name="check" size={15} />
      </span>
      {message}
    </div>
  );
}

export function FormField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
  position,
  element,
  display,
  disabled,
  model,
}) {
  return (
    <label className="form-field">
      <span>
        {label}
        {required && <p style={{ color: "red", display: "inline" }}>*</p>}
      </span>
      {model == 1 ? (
        <input
          type={type}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={onChange}
          required={required}
          disabled={disabled}
          style={{ position, display }}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          style={{ position, display }}
        />
      )}

      {element}
    </label>
  );
}

export function Workspace({ role, routes, nav, logout, children }) {
  const { user } = useUser();
  const { unreadCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  // Derive active label from the current URL. Longest match wins.
  const active = useMemo(() => {
    const entries = Object.entries(routes ?? {});
    if (!entries.length) return nav?.[0]?.[0] ?? null;

    const matches = entries
      .filter(
        ([, path]) =>
          location.pathname === path ||
          location.pathname.startsWith(path + "/"),
      )
      .sort((a, b) => b[1].length - a[1].length);

    return matches[0]?.[0] ?? nav?.[0]?.[0] ?? null;
  }, [location.pathname, routes, nav]);

  const setActive = (label) => {
    const path = routes?.[label];
    if (path) navigate(path);
  };

  const initialsOf = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const roleTitle =
    role === "member"
      ? "Member"
      : role === "leader"
        ? "Group leader"
        : "Lecturer";

  const avatarColor =
    role === "leader" ? "violet" : role === "lecturer" ? "blue" : "teal";

  return (
    <div className={`workspace role-${role}`}>
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Logo light />
          <button
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="role-chip">
          <small>CURRENT WORKSPACE</small>
          <b>{roleTitle}</b>
        </div>

        <nav>
          {nav.map(([label, icon, count]) => (
            <button
              key={label}
              className={active === label ? "active" : ""}
              onClick={() => {
                setActive(label);
                setMobile(false);
              }}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {count > 0 && <em>{count}</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button onClick={logout}>
            <Icon name="logout" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {mobile && (
        <div className="mobile-overlay" onClick={() => setMobile(false)} />
      )}

      <div className="workspace-body">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobile(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" />
          </button>

          <div className="top-search">
            <Icon name="search" size={17} />
            <input placeholder="Search tasks, projects, or people..." />
          </div>

          <div className="top-actions">
            <button
              className="notification-button"
              onClick={() => setActive("Notifications")}
              aria-label="Notifications"
            >
              <Icon name="bell" />
              {unreadCount > 0 && <i />}
            </button>

            <Avatar initials={initialsOf(user?.name)} color={avatarColor} />

            <span>
              <b>{user?.name ?? "—"}</b>
              <small>{roleTitle}</small>
            </span>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, detail, tone = "teal" }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon stat-${tone}`}>
        <Icon name={icon} />
      </span>
      <p>{label}</p>
      <h3>{value}</h3>
      <small>{detail}</small>
    </article>
  );
}
