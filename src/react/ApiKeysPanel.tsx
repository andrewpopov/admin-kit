import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminApiKey,
  type AdminApiKeysAdapter,
  formatAdminTimestamp,
  resolveAdminApiKeyState,
  validateAdminApiKeyCreated,
  validateAdminApiKeys,
} from "../core";
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import { AdminPanelStateView } from "./AdminPanelState";

export interface ApiKeysPanelProps<CreateInput, UpdateInput = never> {
  adapter: AdminApiKeysAdapter<CreateInput, UpdateInput>;
  /** Product vocabulary for credentials, such as "Personal access tokens". */
  title?: string;
  createInput?: CreateInput;
  renderCreate?: (controls: {
    /** Resolves true only when the panel accepted and revealed the new secret. */
    create: (input: CreateInput) => Promise<boolean>;
    pending: boolean;
  }) => ReactNode;
  renderEdit?: (controls: {
    key: AdminApiKey;
    update: (input: UpdateInput) => Promise<boolean>;
    pending: boolean;
  }) => ReactNode;
  /**
   * Replaces the default list without moving lifecycle state or confirmation
   * behavior into the host application. Use this when the product has
   * domain-specific credential policy to present alongside each key.
   */
  renderKeys?: (controls: {
    keys: readonly AdminApiKey[];
    requestRevoke: (key: AdminApiKey) => void;
    requestRotate?: (key: AdminApiKey) => void;
    update?: (key: AdminApiKey, input: UpdateInput) => Promise<boolean>;
    pendingKeyId?: string;
  }) => ReactNode;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
  /** Optional host class for the portaled confirmation dialog. */
  dialogClassName?: string;
  /** Overrides the default timestamp presentation for lastUsedAt / expiresAt. */
  formatTimestamp?: (iso: string) => string;
}

/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export function ApiKeysPanel<CreateInput, UpdateInput = never>({
  adapter,
  title = "API keys",
  createInput,
  renderCreate,
  renderEdit,
  renderKeys,
  className,
  dialogClassName,
  formatTimestamp,
}: ApiKeysPanelProps<CreateInput, UpdateInput>) {
  const [keys, setKeys] = useState<readonly AdminApiKey[]>();
  const [secret, setSecret] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [pending, setPending] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<string>();
  const [confirmation, setConfirmation] = useState<
    { action: "revoke" | "rotate"; key: AdminApiKey } | undefined
  >();
  const latestLoadId = useRef(0);
  // Bumped only when the `adapter` prop itself changes (unlike `latestLoadId`,
  // which also advances on every ordinary reload). Mutations capture this at
  // the start and re-check it after their await: if it moved, the adapter
  // that issued the mutation is no longer current, so its result must not be
  // published or used to trigger a reload.
  const adapterEpoch = useRef(0);
  const load = async () => {
    const loadId = ++latestLoadId.current;
    setLoadError(undefined);
    try {
      const nextKeys = validateAdminApiKeys(await adapter.list());
      if (loadId === latestLoadId.current) setKeys(nextKeys);
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setLoadError(
          reason instanceof Error ? reason.message : "Unable to load API keys.",
        );
      }
    }
  };
  useEffect(() => {
    adapterEpoch.current += 1;
    // A failed load under the new adapter must not fall through to
    // displaying the previous adapter's keys.
    setKeys(undefined);
    void load();
    // Invalidate synchronously with the transition: without this, a request
    // in flight for the previous adapter can still resolve and pass the
    // `loadId === latestLoadId.current` check because the effect that would
    // have bumped it for the new adapter hasn't started yet.
    return () => { latestLoadId.current += 1; };
  }, [adapter]);
  useEffect(() => {
    setSecret(undefined);
    setCopyStatus(undefined);
  }, [adapter]);
  if (loadError && !keys)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
        className={className}
      />
    );
  if (!keys)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading API keys…" }}
        className={className}
      />
    );
  const lifecycleKeys = keys.map((key) => ({
    ...key,
    state: resolveAdminApiKeyState(key),
  }));
  const create = async (input: CreateInput): Promise<boolean> => {
    const epoch = adapterEpoch.current;
    setPending("create");
    setActionError(undefined);
    try {
      const result = validateAdminApiKeyCreated(await adapter.create(input));
      if (epoch !== adapterEpoch.current) return true;
      setSecret(result.secret);
      setCopyStatus(undefined);
      await load();
      return true;
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to create API key.",
      );
      return false;
    } finally {
      setPending(undefined);
    }
  };
  const update = async (key: AdminApiKey, input: UpdateInput): Promise<boolean> => {
    if (!adapter.update) return false;
    const epoch = adapterEpoch.current;
    setPending(key.id);
    setActionError(undefined);
    try {
      await adapter.update({ keyId: key.id, update: input });
      if (epoch === adapterEpoch.current) await load();
      return true;
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to update API key.");
      return false;
    } finally {
      setPending(undefined);
    }
  };
  const copySecret = async () => {
    if (!secret) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(secret);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed. Select and copy the secret manually.");
    }
  };
  const confirmAction = async () => {
    if (!confirmation) return;
    const { action, key } = confirmation;
    const epoch = adapterEpoch.current;
    setPending(key.id);
    setActionError(undefined);
    try {
      if (action === "revoke") {
        await adapter.revoke({ keyId: key.id });
      } else if (adapter.rotate) {
        const result = validateAdminApiKeyCreated(
          await adapter.rotate({ keyId: key.id }),
        );
        if (epoch === adapterEpoch.current) {
          setSecret(result.secret);
          setCopyStatus(undefined);
        }
      }
      if (epoch === adapterEpoch.current) await load();
      setConfirmation(undefined);
    } catch (reason) {
      setActionError(
        reason instanceof Error
          ? reason.message
          : `Unable to ${action} API key.`,
      );
    } finally {
      setPending(undefined);
    }
  };
  const requestRevoke = (key: AdminApiKey) =>
    setConfirmation({ action: "revoke", key });
  const requestRotate = adapter.rotate
    ? (key: AdminApiKey) => setConfirmation({ action: "rotate", key })
    : undefined;
  return (
    <section className={["admin-kit__keys", className].filter(Boolean).join(" ")} aria-label={title}>
      <h2>{title}</h2>
      {loadError ? (
        <AdminPanelStateView
          state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
        />
      ) : null}
      {actionError ? <p className="admin-kit__action-error" role="alert">{actionError}</p> : null}
      {secret ? (
        <div className="admin-kit__secret" role="alert">
          <strong>Copy this secret now. It will not be shown again.</strong>
          <code>{secret}</code>
          <button type="button" onClick={() => void copySecret()}>Copy secret</button>
          {copyStatus ? <span aria-live="polite">{copyStatus}</span> : null}
          <button type="button" onClick={() => setSecret(undefined)}>
            I copied it
          </button>
        </div>
      ) : null}
      {renderCreate ? (
        renderCreate({
          create,
          pending: pending === "create",
        })
      ) : createInput !== undefined ? (
        <button
          type="button"
          disabled={pending === "create"}
          onClick={() => void create(createInput)}
        >
          Create API key
        </button>
      ) : null}
      {renderKeys ? renderKeys({
        keys: lifecycleKeys,
        requestRevoke,
        requestRotate,
        update: adapter.update ? update : undefined,
        pendingKeyId: pending === "create" ? undefined : pending,
      }) : <ul className="admin-kit__keys-list">
        {lifecycleKeys.map((key) => (
          <li key={key.id}>
            <div>
              <strong>{key.name}</strong>
              <code>{key.maskedKey}</code>
              <p>
                {key.state} · scopes: {key.scopes.join(", ") || "none"} · last
                used: {key.lastUsedAt ? formatAdminTimestamp(key.lastUsedAt, formatTimestamp) : "never"} · expires:{" "}
                {key.expiresAt ? formatAdminTimestamp(key.expiresAt, formatTimestamp) : "never"}
              </p>
              {key.details?.length ? (
                <dl className="admin-kit__key-details">
                  {key.details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
                </dl>
              ) : null}
            </div>
            {key.state === "active" ? (
              <div className="admin-kit__key-actions">
                {adapter.rotate ? (
                  <button
                    type="button"
                    disabled={pending === key.id}
                    onClick={() => requestRotate?.(key)}
                  >
                    Rotate
                  </button>
                ) : null}
                {adapter.update && renderEdit ? renderEdit({ key, update: (input) => update(key, input), pending: pending === key.id }) : null}
                <button
                  type="button"
                  disabled={pending === key.id}
                  onClick={() => requestRevoke(key)}
                >
                  Revoke
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>}
      <AdminConfirmationDialog
        open={Boolean(confirmation)}
        className={dialogClassName}
        title={confirmation?.action === "rotate" ? "Rotate API key" : "Revoke API key"}
        description={
          confirmation?.action === "rotate"
            ? "The current credential will stop working. Copy the replacement secret immediately after rotating it."
            : "This credential will stop working immediately and cannot be restored."
        }
        confirmLabel={confirmation?.action === "rotate" ? "Rotate key" : "Revoke key"}
        danger={confirmation?.action === "revoke"}
        pending={Boolean(confirmation) && pending === confirmation?.key.id}
        onCancel={() => setConfirmation(undefined)}
        onConfirm={() => void confirmAction()}
      />
    </section>
  );
}
