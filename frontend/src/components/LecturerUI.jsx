const paths = {
  home: (
    <>
      <path d="m3 11 9-8 9 8v10h-6v-6H9v6H3z" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-6A3.5 3.5 0 0 0 3 18.5V20" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M21 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 9 1.5 1.5L12 8M14 10h3M8 15h9" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6z" />
      <path d="M14 2v5h5M9 13h6M9 17h6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
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
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
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
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-5" />
    </>
  ),
  logout: (
    <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
};

export function Icon({ name, size = 19 }) {
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
      {paths[name]}
    </svg>
  );
}

export function Button({
  children,
  kind = "primary",
  onClick,
  disabled,
  type = "button",
}) {
  return (
    <button
      className={`t-button t-button-${kind}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "blue" }) {
  return <span className={`t-badge t-badge-${tone}`}>{children}</span>;
}

export function Progress({ value }) {
  return (
    <div className="t-progress">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

export function Avatar({ initials, onClick }) {
  return (
    <span className="t-avatar" onClick={onClick}>
      {initials}
    </span>
  );
}

export function Modal({
  title,
  subtitle,
  close,
  children,
  footer,
  wide = false,
  onClick,
}) {
  return (
    <div className="t-modal-backdrop" onMouseDown={close}>
      <section
        className={`t-modal ${wide ? "wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onClick}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button onClick={close} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </header>
        <div className="t-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </section>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  children,
  options,
  disabled = false,
  defaultValue,
}) {
  return (
    <label className="t-field">
      <span>{label}</span>
      {children ||
        (type === "select" ? (
          <select value={value} onChange={onChange}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((value, index) => (
              <option key={value} value={value}>
                {` ${value?.toString().charAt(0).toUpperCase()}${value
                  ?.toString()
                  .slice(1)}`}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            defaultValue={defaultValue}
          />
        ))}
    </label>
  );
}

export function PageTitle({ eyebrow, title, description, children }) {
  return (
    <header className="t-page-title">
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <aside>{children}</aside>}
    </header>
  );
}

export function Stat({ icon, label, value, meta }) {
  return (
    <article className="t-stat">
      <span>
        <Icon name={icon} />
      </span>
      <div>
        <small>{label}</small>
        <b>{value}</b>
        <p>{meta}</p>
      </div>
    </article>
  );
}

export function Toggle({ label, text, checked = false, onChange }) {
  return (
    <label className="t-toggle">
      <span>
        <b>{label}</b>
        <small>{text}</small>
      </span>
      <input type="checkbox" defaultChecked={checked} onChange={onChange} />
    </label>
  );
}

export function SettingsHead({ title, text }) {
  return (
    <div className="t-settings-head">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export function Empty({ title, text }) {
  return (
    <div className="t-empty">
      <Icon name="search" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
