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
}

/** A source-aware flag panel that never offers a misleading mutable control. */
export function FeatureFlagsPanel({ adapter }: FeatureFlagsPanelProps) {
  const [snapshot, setSnapshot] = useState<AdminFeatureFlagsSnapshot>();
  const [error, setError] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();

  const load = async () => {
    setError(undefined);
    try {
      setSnapshot(validateAdminFeatureFlagsSnapshot(await adapter.list()));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load feature flags.",
      );
    }
  };

  useEffect(() => {
    void load();
  }, [adapter]);

  if (error)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: error, onRetry: () => void load() }}
      />
    );
  if (!snapshot)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading feature flags…" }}
      />
    );

  const setEnabled = async (key: string, enabled: boolean) => {
    if (!adapter.setEnabled) return;
    setPendingKey(key);
    setError(undefined);
    try {
      await adapter.setEnabled({ key, enabled });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update the feature flag.",
      );
    } finally {
      setPendingKey(undefined);
    }
  };

  return (
    <section className="admin-kit__flags" aria-label="Feature flags">
      <header className="admin-kit__flags-header">
        <h2>Feature flags</h2>
        <p>
          Store health: <strong>{snapshot.storeHealth}</strong>
        </p>
        {snapshot.storeHealthDetail ? (
          <p role="status">{snapshot.storeHealthDetail}</p>
        ) : null}
      </header>
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
