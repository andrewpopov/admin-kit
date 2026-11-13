import type { ElementType, ReactNode } from "react";
import { AdminPanelHeader, type AdminPanelHeaderCollapsible } from "./AdminPanelHeader";

export interface AdminWorkspaceProps {
  /**
   * The landmark used for the workspace. Keep the default for a standalone
   * route; choose `section` when the host page already owns the only `main`.
   */
  as?: "main" | "section";
  title: string;
  /** Hide the visible title band when a nested panel already supplies the route heading. */
  showHeader?: boolean;
  /**
   * Let a data panel own the route header while the workspace keeps spacing
   * and landmarks without wrapping that header in another card.
   */
  presentation?: "framed" | "panel-led";
  description?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  toolbar?: ReactNode;
  /** Renders the framed header as a collapsible panel header: `description`, `summary` and `toolbar` collapse; the title and `actions` do not. Ignored when the header is hidden or panel-led. */
  collapsible?: AdminPanelHeaderCollapsible;
  children: ReactNode;
  className?: string;
}

/** Standard semantic framing for dense administrative and operational views. */
export function AdminWorkspace({
  as = "main",
  title,
  showHeader = true,
  presentation = "framed",
  description,
  actions,
  summary,
  toolbar,
  collapsible,
  children,
  className,
}: AdminWorkspaceProps) {
  const Workspace = as as ElementType;
  const panelLed = presentation === "panel-led";
  const collapsibleHeader = showHeader && !panelLed && collapsible;

  return (
    <Workspace
      className={[
        "admin-kit",
        "admin-kit--theme-core",
        "admin-kit__workspace",
        panelLed ? "admin-kit__workspace--panel-led" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-admin-kit-theme="core"
    >
      {collapsibleHeader ? (
        <AdminPanelHeader
          actions={actions}
          collapsible={collapsible}
          detail={description ? <p>{description}</p> : null}
          presentation="page"
          summary={summary}
          title={title}
          toolbar={toolbar}
        />
      ) : null}
      {showHeader && !panelLed && !collapsible ? (
        <header className="admin-kit__workspace-header">
          <div>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="admin-kit__workspace-actions">{actions}</div> : null}
        </header>
      ) : null}
      {summary && !collapsibleHeader ? (
        <section className="admin-kit__workspace-summary" aria-label={`${title} summary`}>
          {summary}
        </section>
      ) : null}
      {toolbar && !collapsibleHeader ? (
        <div className="admin-kit__workspace-toolbar">{toolbar}</div>
      ) : null}
      <section
        className={[
          "admin-kit__workspace-content",
          panelLed ? "admin-kit__workspace-content--bare" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={title}
      >
        {children}
      </section>
    </Workspace>
  );
}
