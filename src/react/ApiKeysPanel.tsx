import { useEffect, useState } from "react";
import {
  type AdminApiKey,
  type AdminApiKeysAdapter,
  validateAdminApiKeys,
} from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

export interface ApiKeysPanelProps<CreateInput> {
  adapter: AdminApiKeysAdapter<CreateInput>;
  createInput: CreateInput;
}

/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export function ApiKeysPanel<CreateInput>({
  adapter,
  createInput,
}: ApiKeysPanelProps<CreateInput>) {
  const [keys, setKeys] = useState<readonly AdminApiKey[]>();
  const [secret, setSecret] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState<string>();
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
  const create = async () => {
    setPending("create");
    try {
      const result = await adapter.create(createInput);
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
  const revoke = async (keyId: string) => {
    if (!window.confirm("Revoke this API key? This cannot be undone.")) return;
    setPending(keyId);
    try {
      await adapter.revoke({ keyId });
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to revoke API key.",
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
      <button
        type="button"
        disabled={pending === "create"}
        onClick={() => void create()}
      >
        Create API key
      </button>
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
              <button
                type="button"
                disabled={pending === key.id}
                onClick={() => void revoke(key.id)}
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
