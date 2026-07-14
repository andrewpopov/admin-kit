import { useEffect, useState } from "react";
import {
  type AdminFeatureFlagsAdapter,
  type AdminFeatureFlagsSnapshot,
  validateAdminFeatureFlagsSnapshot,
} from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

const sourceLabel: Record<
  AdminFeatureFlagsSnapshot["flags"][number]["source"],
  string
> = {
  store: "Store override",
  environment: "Environment controlled",
  default: "Default value",
  "store-error-policy": "Store unavailable policy",
};

export interface FeatureFlagsPanelProps {
  adapter: AdminFeatureFlagsAdapter;
  title?: string;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
}

/** A source-aware flag panel that never offers a misleading mutable control. */
export function FeatureFlagsPanel({ adapter, title = "Feature flags", className }: FeatureFlagsPanelProps) {
  const [snapshot, setSnapshot] = useState<AdminFeatureFlagsSnapshot>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();

  const load = async () => {
    setLoadError(undefined);
    try {
      setSnapshot(validateAdminFeatureFlagsSnapshot(await adapter.list()));
    } catch (reason) {
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "Unable to load feature flags.",
      );
    }
  };

  useEffect(() => {
    void load();
  }, [adapter]);

  if (loadError && !snapshot)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
        className={className}
      />
    );
  if (!snapshot)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading feature flags…" }}
        className={className}
      />
    );

  const setEnabled = async (key: string, enabled: boolean) => {
    if (!adapter.setEnabled) return;
    setPendingKey(key);
    setActionError(undefined);
    try {
      await adapter.setEnabled({ key, enabled });
      await load();
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : "Unable to update the feature flag.",
      );
    } finally {
      setPendingKey(undefined);
    }
  };

  return (
    <section className={["admin-kit__flags", className].filter(Boolean).join(" ")} aria-label={title}>
      <header className="admin-kit__flags-header">
        <h2>{title}</h2>
        <p>
          Store health: <strong>{snapshot.storeHealth}</strong>
        </p>
        {snapshot.storeHealthDetail ? (
          <p role="status">{snapshot.storeHealthDetail}</p>
        ) : null}
      </header>
      {loadError ? (
        <AdminPanelStateView
          state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
        />
      ) : null}
      {actionError ? <p className="admin-kit__action-error" role="alert">{actionError}</p> : null}
      <ul className="admin-kit__flags-list">
        {snapshot.flags.map((flag) => {
          const canMutate =
            flag.mutable &&
            snapshot.storeHealth === "healthy" &&
            Boolean(adapter.setEnabled);
          const controlId = `admin-kit-flag-${flag.key}`;
          return (
            <li className="admin-kit__flag" key={flag.key}>
              <div>
                <label htmlFor={controlId}>{flag.label}</label>
                <code>{flag.key}</code>
                {flag.description ? <p>{flag.description}</p> : null}
                <p className="admin-kit__flag-source">
                  Source: {sourceLabel[flag.source]}
                </p>
              </div>
              <input
                aria-label={`Set ${flag.label} ${flag.enabled ? "off" : "on"}`}
                checked={flag.enabled}
                disabled={!canMutate || pendingKey === flag.key}
                id={controlId}
                onChange={(event) =>
                  void setEnabled(flag.key, event.target.checked)
                }
                type="checkbox"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
