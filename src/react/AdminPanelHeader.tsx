import type { ElementType, ReactNode } from "react";

export type AdminPanelHeaderPresentation = "section" | "page";

export interface AdminPanelHeaderProps {
  title: string;
  presentation?: AdminPanelHeaderPresentation;
  detail?: ReactNode;
  actions?: ReactNode;
  /** Search, filters, and secondary controls grouped below the title band. */
  toolbar?: ReactNode;
  className?: string;
}

/** One title/action band shared by standalone panels and panel-led pages. */
export function AdminPanelHeader({
  title,
  presentation = "section",
  detail,
  actions,
  toolbar,
  className,
}: AdminPanelHeaderProps) {
  const Heading = (presentation === "page" ? "h1" : "h2") as ElementType;

  return (
    <header className={[
      "admin-kit__panel-header",
      `admin-kit__panel-header--${presentation}`,
      toolbar ? "admin-kit__panel-header--with-toolbar" : undefined,
      className,
    ].filter(Boolean).join(" ")}>
      <div className="admin-kit__panel-header-main">
        <div>
          <Heading>{title}</Heading>
          {detail}
        </div>
        {actions ? <div className="admin-kit__panel-header-actions">{actions}</div> : null}
      </div>
      {toolbar ? <div className="admin-kit__panel-toolbar">{toolbar}</div> : null}
    </header>
  );
}
