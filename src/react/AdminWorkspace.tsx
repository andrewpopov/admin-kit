import type { ReactNode } from "react";

export interface AdminWorkspaceProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Standard semantic framing for dense administrative and operational views. */
export function AdminWorkspace({ title, description, actions, summary, toolbar, children, className }: AdminWorkspaceProps) {
  return <main className={["admin-kit__workspace", className].filter(Boolean).join(" ")}>
    <header className="admin-kit__workspace-header">
      <div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>
      {actions ? <div className="admin-kit__workspace-actions">{actions}</div> : null}
    </header>
    {summary ? <section className="admin-kit__workspace-summary" aria-label={`${title} summary`}>{summary}</section> : null}
    {toolbar ? <div className="admin-kit__workspace-toolbar">{toolbar}</div> : null}
    <section className="admin-kit__workspace-content" aria-label={title}>{children}</section>
  </main>;
}
