import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface AdminCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A canonical container for product-specific content inside an admin section. */
export function AdminCard({ title, description, actions, children, className }: AdminCardProps) {
  return (
    <section className={["admin-kit__card", className].filter(Boolean).join(" ")}>
      {title || description || actions ? (
        <header className="admin-kit__card-header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="admin-kit__card-actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="admin-kit__card-content">{children}</div>
    </section>
  );
}

export interface AdminFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Labels extension controls with the same spacing, hierarchy, and error treatment. */
export function AdminField({ label, hint, error, children, className }: AdminFieldProps) {
  return (
    <label className={["admin-kit__field", className].filter(Boolean).join(" ")}>
      <span className="admin-kit__field-label">{label}</span>
      {children}
      {hint ? <small className="admin-kit__field-hint">{hint}</small> : null}
      {error ? <small className="admin-kit__field-error" role="alert">{error}</small> : null}
    </label>
  );
}

export interface AdminStackProps {
  children: ReactNode;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

/** A stable vertical rhythm for custom extension content. */
export function AdminStack({ children, gap = "md", className }: AdminStackProps) {
  return <div className={["admin-kit__stack", `admin-kit__stack--${gap}`, className].filter(Boolean).join(" ")}>{children}</div>;
}

export interface AdminSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  checked: boolean;
  label: ReactNode;
  description?: ReactNode;
  statusLabel?: ReactNode;
}

/** A full-row, labelled switch for consequential binary admin settings. */
export function AdminSwitch({ checked, label, description, statusLabel, className, type = "button", ...props }: AdminSwitchProps) {
  return (
    <button
      {...props}
      aria-checked={checked}
      className={["admin-kit__switch", className].filter(Boolean).join(" ")}
      data-state={checked ? "on" : "off"}
      role="switch"
      type={type}
    >
      <span aria-hidden="true" className="admin-kit__switch-track"><span /></span>
      <span className="admin-kit__switch-copy">
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <span className="admin-kit__switch-status">{statusLabel ?? (checked ? "On" : "Off")}</span>
    </button>
  );
}
