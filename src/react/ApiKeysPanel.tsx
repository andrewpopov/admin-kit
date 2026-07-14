import { useEffect, useState, type ReactNode } from "react";
import {
  type AdminApiKey,
  type AdminApiKeysAdapter,
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
    pendingKeyId?: string;
  }) => ReactNode;
}

/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export function ApiKeysPanel<CreateInput, UpdateInput = never>({
  adapter,
  title = "API keys",
  createInput,
  renderCreate,
  renderEdit,
  renderKeys,
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
  const load = async () => {
    setLoadError(undefined);
    try {
      setKeys(validateAdminApiKeys(await adapter.list()));
    } catch (reason) {
      setLoadError(
        reason instanceof Error ? reason.message : "Unable to load API keys.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, [adapter]);
  if (loadError && !keys)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
      />
    );
  if (!keys)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading API keys…" }}
      />
    );
  const create = async (input: CreateInput): Promise<boolean> => {
    setPending("create");
    setActionError(undefined);
    try {
      const result = validateAdminApiKeyCreated(await adapter.create(input));
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
    setPending(key.id);
    setActionError(undefined);
    try {
      await adapter.update({ keyId: key.id, update: input });
      await load();
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
    setPending(key.id);
    setActionError(undefined);
    try {
      if (action === "revoke") {
        await adapter.revoke({ keyId: key.id });
      } else if (adapter.rotate) {
        const result = validateAdminApiKeyCreated(
          await adapter.rotate({ keyId: key.id }),
        );
        setSecret(result.secret);
        setCopyStatus(undefined);
      }
      await load();
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
    <section className="admin-kit__keys" aria-label={title}>
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
        keys,
        requestRevoke,
        requestRotate,
        pendingKeyId: pending === "create" ? undefined : pending,
      }) : <ul className="admin-kit__keys-list">
        {keys.map((key) => (
          <li key={key.id}>
            <div>
              <strong>{key.name}</strong>
              <code>{key.maskedKey}</code>
              <p>
                {key.state} · scopes: {key.scopes.join(", ") || "none"} · last
                used: {key.lastUsedAt ?? "never"} · expires: {key.expiresAt ?? "never"}
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
        title={confirmation?.action === "rotate" ? "Rotate API key" : "Revoke API key"}
        description={
          confirmation?.action === "rotate"
            ? "The current credential will stop working. Copy the replacement secret immediately after rotating it."
            : "This credential will stop working immediately and cannot be restored."
        }
        confirmLabel={confirmation?.action === "rotate" ? "Rotate key" : "Revoke key"}
        danger={confirmation?.action === "revoke"}
        onCancel={() => setConfirmation(undefined)}
        onConfirm={() => void confirmAction()}
      />
    </section>
  );
}
