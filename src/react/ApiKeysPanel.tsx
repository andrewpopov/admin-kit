import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import {
  type AdminApiKey,
  type AdminApiKeyCreateRequest,
  type AdminApiKeyQueueItem,
  type AdminApiKeysAdapter,
  type AdminApiKeyScopeUpdate,
  type AdminApiKeysPosture,
  type AdminApiKeysSummary,
  type AdminScopeGroup,
  deriveAdminApiKeysPosture,
  deriveAdminApiKeysQueue,
  formatAdminTimestamp,
  resolveAdminApiKeyState,
  summarizeAdminApiKeys,
  validateAdminApiKeyCreated,
  validateAdminApiKeys,
} from "../core";
import { AdminApiKeyForm } from "./AdminApiKeyForm";
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import {
  AdminPanelHeader,
  type AdminPanelHeaderPresentation,
} from "./AdminPanelHeader";
import { AdminPanelStateView } from "./AdminPanelState";

/** Props whose types never depend on the adapter's create/update shapes. */
interface ApiKeysPanelSharedProps {
  /** Product vocabulary for credentials, such as "Personal access tokens". */
  title?: string;
  /** Promote the panel heading and host actions into the route-level header band. */
  headerPresentation?: AdminPanelHeaderPresentation;
  /** Host-owned primary actions displayed beside the panel title. */
  headerActions?: ReactNode;
  /**
   * Renders a host-vocabulary posture/health summary above the create/list
   * regions; the kit derives the facts, the host owns copy and links.
   */
  renderPosture?: (controls: {
    summary: AdminApiKeysSummary;
    posture: AdminApiKeysPosture;
    queue: readonly AdminApiKeyQueueItem[];
  }) => ReactNode;
  /**
   * Renders host navigation tiles/shortcuts (hosts own routes); badge counts
   * come from the summary.
   */
  renderShortcuts?: (controls: {
    summary: AdminApiKeysSummary;
    posture: AdminApiKeysPosture;
    queue: readonly AdminApiKeyQueueItem[];
  }) => ReactNode;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
  /** Optional host class for the portaled confirmation dialog. */
  dialogClassName?: string;
  /** Overrides the default timestamp presentation for lastUsedAt / expiresAt. */
  formatTimestamp?: (iso: string) => string;
}

/** The adapter-shaped props and render-prop escape hatches, keyed to CreateInput/UpdateInput. */
interface ApiKeysPanelDataProps<CreateInput, UpdateInput> {
  adapter: AdminApiKeysAdapter<CreateInput, UpdateInput>;
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
}

/**
 * Generic/legacy mode: arbitrary `CreateInput`/`UpdateInput`, all the
 * render-prop escape hatches, and no `scopeGroups`. Behaves exactly as the
 * panel always has.
 */
type ApiKeysPanelGenericProps<CreateInput, UpdateInput = never> =
  ApiKeysPanelSharedProps &
    ApiKeysPanelDataProps<CreateInput, UpdateInput> & {
      scopeGroups?: undefined;
      minimumScopeCount?: undefined;
    };

/**
 * Built-in mode: opting into the kit's scope-aware create + edit flows pins the
 * adapter to the standard request shapes, so `create`/`update` are type-correct
 * with no casts and a mismatched adapter is a compile error.
 */
type ApiKeysPanelBuiltinProps = ApiKeysPanelSharedProps &
  ApiKeysPanelDataProps<AdminApiKeyCreateRequest, AdminApiKeyScopeUpdate> & {
    /**
     * Provides the scope vocabulary for the collapsible create card and the
     * inline per-key scope editor. `renderCreate`/`renderEdit`/`renderKeys`
     * still win where provided.
     */
    scopeGroups: readonly AdminScopeGroup[];
    /** Minimum scopes required by the host before create or edit can submit. */
    minimumScopeCount?: number;
  };

export type ApiKeysPanelProps<CreateInput, UpdateInput = never> =
  | ApiKeysPanelGenericProps<CreateInput, UpdateInput>
  | ApiKeysPanelBuiltinProps;

/**
 * The implementation is typed to the built-in request shapes. Both union arms
 * share those shapes here (the generic arm is specialized to them at the public
 * boundary), so `adapter`, `create`, and `update` are concrete inside the body
 * and the built-in create/edit wiring needs no casts.
 */
function ApiKeysPanelImpl({
  adapter,
  title = "API keys",
  headerPresentation = "section",
  headerActions,
  createInput,
  renderCreate,
  renderEdit,
  renderKeys,
  renderPosture,
  renderShortcuts,
  scopeGroups,
  minimumScopeCount,
  className,
  dialogClassName,
  formatTimestamp,
}: ApiKeysPanelProps<AdminApiKeyCreateRequest, AdminApiKeyScopeUpdate>) {
  const [keys, setKeys] = useState<readonly AdminApiKey[]>();
  const [secret, setSecret] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [pending, setPending] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<string>();
  const [confirmation, setConfirmation] = useState<
    { action: "revoke" | "rotate"; key: AdminApiKey } | undefined
  >();
  // Presentation-only UI state for the built-in flows; these do not touch the
  // load/mutation lifecycle below.
  const [createOpen, setCreateOpen] = useState(false);
  const [editingKeyId, setEditingKeyId] = useState<string>();
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
  const panelHeader = (counts?: { total: number; active: number }) => (
    <AdminPanelHeader
      actions={headerActions}
      className="admin-kit__keys-header"
      detail={counts ? <p>
        {counts.total} {counts.total === 1 ? "credential" : "credentials"}
        {counts.total > 0 ? ` · ${counts.active} active` : ""}
      </p> : null}
      presentation={headerPresentation}
      title={title}
    />
  );
  if (loadError && !keys)
    return (
      <section className={["admin-kit__keys", className].filter(Boolean).join(" ")} aria-label={title}>
        {panelHeader()}
        <AdminPanelStateView state={{ kind: "error", detail: loadError, onRetry: () => void load() }} />
      </section>
    );
  if (!keys)
    return (
      <section className={["admin-kit__keys", className].filter(Boolean).join(" ")} aria-label={title}>
        {panelHeader()}
        <AdminPanelStateView state={{ kind: "loading", label: "Loading API keys…" }} />
      </section>
    );
  const lifecycleKeys = keys.map((key) => ({
    ...key,
    state: resolveAdminApiKeyState(key),
  }));
  let postureControls:
    | { summary: AdminApiKeysSummary; posture: AdminApiKeysPosture; queue: readonly AdminApiKeyQueueItem[] }
    | undefined;
  if (renderPosture || renderShortcuts) {
    const summary = summarizeAdminApiKeys(keys);
    postureControls = {
      summary,
      posture: deriveAdminApiKeysPosture(summary),
      queue: deriveAdminApiKeysQueue(summary),
    };
  }
  const create = async (input: AdminApiKeyCreateRequest): Promise<boolean> => {
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
  const update = async (key: AdminApiKey, input: AdminApiKeyScopeUpdate): Promise<boolean> => {
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
  const activeCount = lifecycleKeys.filter((key) => key.state === "active").length;
  // The built-in inline scope editor is active only when the host opted in via
  // `scopeGroups`, did not override edit rendering, and the adapter can persist
  // an update (`adapter.update` is optional — without it Save would no-op).
  const builtInEditEnabled = Boolean(scopeGroups) && !renderEdit && Boolean(adapter.update);
  return (
    <section className={["admin-kit__keys", className].filter(Boolean).join(" ")} aria-label={title}>
      {panelHeader({ total: lifecycleKeys.length, active: activeCount })}
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
          <div className="admin-kit__secret-actions">
            <button className="admin-kit__button admin-kit__button--primary" type="button" onClick={() => void copySecret()}>Copy secret</button>
            <button className="admin-kit__button" type="button" onClick={() => setSecret(undefined)}>
              I copied it
            </button>
            {copyStatus ? <span aria-live="polite" className="admin-kit__secret-status">{copyStatus}</span> : null}
          </div>
        </div>
      ) : null}
      {renderPosture && postureControls ? renderPosture(postureControls) : null}
      {renderShortcuts && postureControls ? renderShortcuts(postureControls) : null}
      {renderCreate ? (
        renderCreate({
          create,
          pending: pending === "create",
        })
      ) : scopeGroups ? (
        <details
          className="admin-kit__key-create"
          open={createOpen}
          onToggle={(event) => setCreateOpen(event.currentTarget.open)}
        >
          <summary>
            <span className="admin-kit__key-create-icon" aria-hidden="true">＋</span> Create a new key
          </summary>
          <div className="admin-kit__key-create-body">
            <AdminApiKeyForm
              mode="create"
              scopeGroups={scopeGroups}
              minimumScopeCount={minimumScopeCount}
              pending={pending === "create"}
              onSubmit={(request) => void create(request as AdminApiKeyCreateRequest)}
            />
          </div>
        </details>
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
      }) : lifecycleKeys.length === 0 ? (
        <AdminPanelStateView state={{ kind: "empty", title: "No API keys yet." }} />
      ) : (
        <ol className="admin-kit__key-cards">
          {lifecycleKeys.map((key) => {
            const isEditing = builtInEditEnabled && editingKeyId === key.id;
            const isPending = pending === key.id;
            return (
              <li aria-busy={isPending} className="admin-kit__key-card" key={key.id}>
                <div className="admin-kit__key-card-header">
                  <div className="admin-kit__key-identity">
                    <strong>{key.name}</strong>
                    <code>{key.maskedKey}</code>
                  </div>
                  <span className={`admin-kit__state-pill admin-kit__state-pill--key-${key.state}`}>{key.state}</span>
                </div>
                <dl className="admin-kit__key-summary">
                  <div>
                    <dt>Last used</dt>
                    <dd>{key.lastUsedAt ? formatAdminTimestamp(key.lastUsedAt, formatTimestamp) : "never"}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>{key.expiresAt ? formatAdminTimestamp(key.expiresAt, formatTimestamp) : "never"}</dd>
                  </div>
                  {key.details?.[0] ? (
                    <div>
                      <dt>{key.details[0].label}</dt>
                      <dd>{key.details[0].value}</dd>
                    </div>
                  ) : null}
                </dl>
                <details className="admin-kit__key-details-disclosure">
                  <summary aria-label={`Scopes and details for ${key.name}`}>{key.scopes.length} {key.scopes.length === 1 ? "scope" : "scopes"}</summary>
                  {key.scopes.length ? (
                    <ul className="admin-kit__scope-chips">
                      {key.scopes.map((scope) => (
                        <li className="admin-kit__scope-chip" key={scope}>{scope}</li>
                      ))}
                    </ul>
                  ) : <span className="admin-kit__key-empty">No scopes assigned.</span>}
                  {key.details && key.details.length > 1 ? (
                    <dl className="admin-kit__key-details">
                      {key.details.slice(1).map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}
                    </dl>
                  ) : null}
                </details>
                {key.state === "active" ? (
                  <div className="admin-kit__key-actions">
                    {builtInEditEnabled ? (
                      <button
                        className="admin-kit__key-edit-btn"
                        type="button"
                        aria-label={`Edit scopes for ${key.name}`}
                        aria-expanded={isEditing}
                        aria-controls={`admin-kit-key-edit-${key.id}`}
                        disabled={isPending}
                        onClick={() => setEditingKeyId(isEditing ? undefined : key.id)}
                      >
                        Edit scopes
                      </button>
                    ) : null}
                    {adapter.rotate ? <button type="button" aria-label={`Rotate ${key.name}`} disabled={isPending} onClick={() => requestRotate?.(key)}>Rotate</button> : null}
                    {adapter.update && renderEdit ? renderEdit({ key, update: (input) => update(key, input), pending: isPending }) : null}
                    <button type="button" aria-label={`Revoke ${key.name}`} disabled={isPending} onClick={() => requestRevoke(key)}>Revoke</button>
                  </div>
                ) : null}
                {isEditing && scopeGroups ? (
                  <div className="admin-kit__key-edit" id={`admin-kit-key-edit-${key.id}`} role="region" aria-label={`Edit scopes for ${key.name}`}>
                    <div className="admin-kit__key-edit-header">
                      <h3>Edit scopes</h3>
                      <p>{key.name} · {key.maskedKey}</p>
                    </div>
                    <AdminApiKeyForm
                      mode="edit"
                      scopeGroups={scopeGroups}
                      minimumScopeCount={minimumScopeCount}
                      pending={isPending}
                      initialScopes={key.scopes}
                      onSubmit={async (request) => {
                        const ok = await update(key, request as AdminApiKeyScopeUpdate);
                        if (ok) setEditingKeyId(undefined);
                      }}
                      onCancel={() => setEditingKeyId(undefined)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
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

/**
 * Lists safe metadata and reveals a raw secret only from a create/rotate
 * response. The public API is generic over the adapter's create/update input in
 * legacy mode; passing `scopeGroups` switches to the built-in flows and pins the
 * adapter to the standard request shapes (a mismatched adapter is a compile
 * error). The generic props are specialized to those shapes for the concretely
 * typed implementation — the two arms are otherwise identical, so this carries
 * no runtime effect and no `unknown`/`any`.
 */
export function ApiKeysPanel<CreateInput, UpdateInput = never>(
  props: ApiKeysPanelProps<CreateInput, UpdateInput>,
): ReactElement {
  return (
    <ApiKeysPanelImpl
      {...(props as ApiKeysPanelProps<AdminApiKeyCreateRequest, AdminApiKeyScopeUpdate>)}
    />
  );
}
