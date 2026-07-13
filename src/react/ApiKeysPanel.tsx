import { useEffect, useState, type ReactNode } from "react";
import {
  type AdminApiKey,
  type AdminApiKeysAdapter,
  validateAdminApiKeyCreated,
  validateAdminApiKeys,
} from "../core";
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import { AdminPanelStateView } from "./AdminPanelState";

export interface ApiKeysPanelProps<CreateInput> {
  adapter: AdminApiKeysAdapter<CreateInput>;
  createInput?: CreateInput;
  renderCreate?: (controls: {
    create: (input: CreateInput) => void;
    pending: boolean;
  }) => ReactNode;
}

/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export function ApiKeysPanel<CreateInput>({
  adapter,
  createInput,
  renderCreate,
}: ApiKeysPanelProps<CreateInput>) {
  const [keys, setKeys] = useState<readonly AdminApiKey[]>();
  const [secret, setSecret] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<string>();
  const [confirmation, setConfirmation] = useState<
    { action: "revoke" | "rotate"; key: AdminApiKey } | undefined
  >();
  const load = async () => {
    setError(undefined);
    try {
      setKeys(validateAdminApiKeys(await adapter.list()));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load API keys.",
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
  if (!keys)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading API keys…" }}
      />
    );
  const create = async (input: CreateInput) => {
    setPending("create");
    try {
      const result = validateAdminApiKeyCreated(await adapter.create(input));
      setSecret(result.secret);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to create API key.",
      );
    } finally {
      setPending(undefined);
    }
  };
  const confirmAction = async () => {
    if (!confirmation) return;
    const { action, key } = confirmation;
    setConfirmation(undefined);
    setPending(key.id);
    try {
      if (action === "revoke") {
        await adapter.revoke({ keyId: key.id });
      } else if (adapter.rotate) {
        const result = validateAdminApiKeyCreated(
          await adapter.rotate({ keyId: key.id }),
        );
        setSecret(result.secret);
      }
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `Unable to ${action} API key.`,
      );
    } finally {
      setPending(undefined);
    }
  };
  return (
    <section className="admin-kit__keys" aria-label="API keys">
      <h2>API keys</h2>
      {secret ? (
        <div className="admin-kit__secret" role="alert">
          <strong>Copy this secret now. It will not be shown again.</strong>
          <code>{secret}</code>
          <button type="button" onClick={() => setSecret(undefined)}>
            I copied it
          </button>
        </div>
      ) : null}
      {renderCreate ? (
        renderCreate({
          create: (input) => void create(input),
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
      <ul className="admin-kit__keys-list">
        {keys.map((key) => (
          <li key={key.id}>
            <div>
              <strong>{key.name}</strong>
              <code>{key.maskedKey}</code>
              <p>
                {key.state} · scopes: {key.scopes.join(", ") || "none"} · last
                used: {key.lastUsedAt ?? "never"}
              </p>
            </div>
            {key.state === "active" ? (
              <div className="admin-kit__key-actions">
                {adapter.rotate ? (
                  <button
                    type="button"
                    disabled={pending === key.id}
                    onClick={() => setConfirmation({ action: "rotate", key })}
                  >
                    Rotate
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pending === key.id}
                  onClick={() => setConfirmation({ action: "revoke", key })}
                >
                  Revoke
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
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
