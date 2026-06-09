import type { ReactNode } from "react";

export type IconName =
  | "alert"
  | "application"
  | "bell"
  | "building"
  | "calendar"
  | "chart"
  | "check"
  | "chevron"
  | "clipboard"
  | "clock"
  | "cube"
  | "database"
  | "document"
  | "edit"
  | "external"
  | "filter"
  | "grid"
  | "home"
  | "info"
  | "map"
  | "message"
  | "metro"
  | "money"
  | "more"
  | "plan"
  | "plus"
  | "search"
  | "settings"
  | "team"
  | "user"
  | "wallet";

type CardProps = {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: IconName;
  action?: ReactNode;
};

type PillProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "gray" | "amber";
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}

export function Card({ children, className = "", title, icon, action }: CardProps) {
  return (
    <section className={`ui-card ${className}`}>
      {(title || action) && (
        <div className="ui-card-head">
          <div className="ui-card-title">
            {icon && <Icon name={icon} />}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "gray", className = "" }: PillProps) {
  return <span className={`status-pill status-pill-${tone} ${className}`}>{children}</span>;
}

export function MetricRow({
  icon,
  label,
  value,
  detail,
}: {
  icon?: IconName;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="metric-row">
      {icon && (
        <span className="metric-row-icon">
          <Icon name={icon} />
        </span>
      )}
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "blue",
}: {
  value: number;
  tone?: "blue" | "green";
}) {
  return (
    <span className="progress-track" aria-hidden="true">
      <span
        className={`progress-fill progress-fill-${tone}`}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </span>
  );
}

export function CircularProgress({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div
      className="circular-progress"
      style={{ ["--progress" as string]: `${safeValue * 3.6}deg` }}
      aria-label={`${safeValue}% complete`}
    >
      <span>{safeValue}%</span>
    </div>
  );
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {paths[name]}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const paths: Record<IconName, ReactNode> = {
  alert: <><path {...stroke} d="M12 8v5" /><path {...stroke} d="M12 17h.01" /><path {...stroke} d="M10.3 3.7 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 3.7a1.9 1.9 0 0 0-3.4 0Z" /></>,
  application: <><path {...stroke} d="M8 4h8l3 3v13H5V4h3Z" /><path {...stroke} d="M15 4v4h4" /><path {...stroke} d="M8 13h8" /><path {...stroke} d="M8 17h6" /></>,
  bell: <><path {...stroke} d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path {...stroke} d="M10 21a2 2 0 0 0 4 0" /></>,
  building: <><path {...stroke} d="M4 21V5l8-2 8 2v16" /><path {...stroke} d="M8 9h2M14 9h2M8 13h2M14 13h2M8 17h2M14 17h2" /></>,
  calendar: <><path {...stroke} d="M7 3v3M17 3v3M4 9h16M5 5h14v16H5z" /></>,
  chart: <><path {...stroke} d="M4 19V5" /><path {...stroke} d="M4 19h16" /><path {...stroke} d="m7 15 4-4 3 3 5-7" /></>,
  check: <path {...stroke} d="m5 12 4 4L19 6" />,
  chevron: <path {...stroke} d="m9 6 6 6-6 6" />,
  clipboard: <><path {...stroke} d="M9 4h6l1 2h3v15H5V6h3l1-2Z" /><path {...stroke} d="M9 12h6M9 16h4" /></>,
  clock: <><circle {...stroke} cx="12" cy="12" r="9" /><path {...stroke} d="M12 7v5l3 3" /></>,
  cube: <><path {...stroke} d="M12 2 2 7l10 5 10-5-10-5Z" /><path {...stroke} d="m2 17 10 5 10-5" /><path {...stroke} d="m2 12 10 5 10-5" /></>,
  database: <><ellipse {...stroke} cx="12" cy="5" rx="9" ry="3" /><path {...stroke} d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" /><path {...stroke} d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" /></>,
  document: <><path {...stroke} d="M6 3h9l3 3v15H6z" /><path {...stroke} d="M14 3v4h4" /><path {...stroke} d="M9 13h6M9 17h5" /></>,
  edit: <><path {...stroke} d="M4 20h4L19 9l-4-4L4 16v4Z" /><path {...stroke} d="m13 7 4 4" /></>,
  external: <><path {...stroke} d="M15 3h6v6" /><path {...stroke} d="M10 14 21 3" /><path {...stroke} d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></>,
  filter: <><path {...stroke} d="M4 6h16M7 12h10M10 18h4" /></>,
  grid: <><path {...stroke} d="M5 4h4v4H5zM11 4h4v4h-4zM17 4h4v4h-4zM5 10h4v4H5zM11 10h4v4h-4zM17 10h4v4h-4zM5 16h4v4H5zM11 16h4v4h-4zM17 16h4v4h-4z" /></>,
  home: <><path {...stroke} d="m3 11 9-7 9 7" /><path {...stroke} d="M5 10v10h14V10" /><path {...stroke} d="M10 20v-6h4v6" /></>,
  info: <><circle {...stroke} cx="12" cy="12" r="9" /><path {...stroke} d="M12 8h.01" /><path {...stroke} d="M11 12h1v4h1" /></>,
  map: <><path {...stroke} d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" /><circle {...stroke} cx="12" cy="10" r="2.2" /></>,
  message: <><path {...stroke} d="M4 5h16v11H8l-4 4V5Z" /><path {...stroke} d="M8 9h8M8 13h5" /></>,
  metro: <><path {...stroke} d="M7 4h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" /><path {...stroke} d="M8 20h8M7 9h10M8 15h.01M16 15h.01" /></>,
  money: <><path {...stroke} d="M12 2v20" /><path {...stroke} d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  more: <><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></>,
  plan: <><path {...stroke} d="M5 4h14v16H5z" /><path {...stroke} d="M9 8h6M9 12h6M9 16h3" /></>,
  plus: <><path {...stroke} d="M12 5v14M5 12h14" /></>,
  search: <><circle {...stroke} cx="10.5" cy="10.5" r="6.5" /><path {...stroke} d="m16 16 4 4" /></>,
  settings: <><path {...stroke} d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /><path {...stroke} d="M4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" /></>,
  team: <><path {...stroke} d="M16 11a4 4 0 1 0-8 0" /><path {...stroke} d="M4 20a8 8 0 0 1 16 0" /><path {...stroke} d="M18 8a3 3 0 0 1 3 3" /></>,
  user: <><circle {...stroke} cx="12" cy="8" r="4" /><path {...stroke} d="M4 21a8 8 0 0 1 16 0" /></>,
  wallet: <><path {...stroke} d="M3 7h18v12H3z" /><path {...stroke} d="M3 7V5a2 2 0 0 1 2-2h12" /><path {...stroke} d="M16 13h.01" /></>,
};
