"use client";
import type { ReactNode } from "react";
import { useAdminLabels } from "./AdminLabels";

export type AdminPanelState =
  | { kind: "ready"; children: ReactNode }
  | {
      kind: "loading";
      label?: string;
      /**
       * Render this many placeholder bars instead of bare text. The label stays
       * available to screen readers; omit it (or pass 0) for the plain label.
       */
      skeletonRows?: number;
    }
  | { kind: "empty"; title: string; detail?: string }
  | { kind: "error"; title?: string; detail: string; onRetry?: () => void };

const MAX_SKELETON_ROWS = 12;

/** Accessible, framework-style-neutral state surface for adapter-backed panels. */
export function AdminPanelStateView({
  state,
  className,
}: {
  state: AdminPanelState;
  className?: string;
}) {
  const labels = useAdminLabels();

  if (state.kind === "ready") return <>{state.children}</>;

  if (state.kind === "loading") {
    const label = state.label ?? labels.loading;
    const skeletonRows = Math.min(Math.floor(state.skeletonRows ?? 0), MAX_SKELETON_ROWS);
    if (skeletonRows >= 1) {
      return (
        <p
          aria-live="polite"
          className={["admin-kit__state", "admin-kit__skeleton", className]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="admin-kit__visually-hidden">{label}</span>
          {Array.from({ length: skeletonRows }, (_, row) => (
            <span aria-hidden="true" className="admin-kit__skeleton-bar" key={row} />
          ))}
        </p>
      );
    }
    return (
      <p aria-live="polite" className={["admin-kit__state", className].filter(Boolean).join(" ")}>
        {label}
      </p>
    );
  }

  if (state.kind === "empty") {
    return (
      <div className={["admin-kit__state", className].filter(Boolean).join(" ")} role="status">
        <strong>{state.title}</strong>
        {state.detail ? <p>{state.detail}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={["admin-kit__state", "admin-kit__state--error", className]
        .filter(Boolean)
        .join(" ")}
      role="alert"
    >
      <strong>{state.title ?? labels.errorTitle}</strong>
      <p>{state.detail}</p>
      {state.onRetry ? (
        <button type="button" onClick={state.onRetry}>
          {labels.retry}
        </button>
      ) : null}
    </div>
  );
}
