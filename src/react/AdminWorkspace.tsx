import type { ElementType, ReactNode } from "react";

export interface AdminWorkspaceProps {
  /**
   * The landmark used for the workspace. Keep the default for a standalone
   * route; choose `section` when the host page already owns the only `main`.
   */
  as?: "main" | "section";
  title: string;
  /** Hide the visible title band when a nested panel already supplies the route heading. */
  showHeader?: boolean;
  description?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Standard semantic framing for dense administrative and operational views. */
export function AdminWorkspace({ as = "main", title, showHeader = true, description, actions, summary, toolbar, children, className }: AdminWorkspaceProps) {
  const Workspace = as as ElementType;

  return <Workspace className={["admin-kit", "admin-kit--theme-core", "admin-kit__workspace", className].filter(Boolean).join(" ")} data-admin-kit-theme="core">
    {showHeader ? <header className="admin-kit__workspace-header">
      <div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
      {actions ? <div className="admin-kit__workspace-actions">{actions}</div> : null}
    </header> : null}
    {summary ? <section className="admin-kit__workspace-summary" aria-label={`${title} summary`}>{summary}</section> : null}
    {toolbar ? <div className="admin-kit__workspace-toolbar">{toolbar}</div> : null}
    <section className="admin-kit__workspace-content" aria-label={title}>{children}</section>
  </Workspace>;
}
