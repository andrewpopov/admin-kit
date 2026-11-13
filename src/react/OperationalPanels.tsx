"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  formatAdminTimestamp,
  type AdminBackupSummary,
  type AdminBackupsAdapter,
  type AdminOperationalJob,
  type AdminOperationalJobsAdapter,
  type AdminOperationalStatus,
  type AdminSettingField,
  type AdminSettingsAdapter,
} from "../core";
import { useAdminLabels } from "./AdminLabels";
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import { AdminDataTable, type AdminDataTableColumn } from "./AdminDataTable";
import {
  AdminPanelHeader,
  panelHeaderCollapsible,
  type AdminPanelBandOptions,
  type AdminPanelHeaderPresentation,
} from "./AdminPanelHeader";
import { AdminPanelStateView } from "./AdminPanelState";
import { AdminSwitch } from "./AdminPrimitives";

export interface AdminStatusSummaryProps {
  items: readonly AdminOperationalStatus[];
}

export function AdminStatusSummary({ items }: AdminStatusSummaryProps) {
  return (
    <dl className="admin-kit__status-summary">
      {items.map((item) => (
        <div
          className={`admin-kit__status admin-kit__status--${item.tone ?? "neutral"}`}
          key={item.label}
        >
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          {item.detail ? <small>{item.detail}</small> : null}
        </div>
      ))}
    </dl>
  );
}

export interface OperationalJobsPanelProps {
  adapter: AdminOperationalJobsAdapter;
  title?: string;
  runLabel?: string;
  pageSize?: number;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
  /** Overrides the default timestamp presentation for startedAt / finishedAt. */
  formatTimestamp?: (iso: string) => string;
  /** Explains the useful zero-run state instead of rendering an unexplained empty table. */
  emptyState?: { title: string; detail?: string };
  /** Persist this viewer's column widths under this key. */
  storageKey?: string;
  /** The table fills the viewport and scrolls itself under a pinned header (see `AdminDataTable` `fill`). */
  tableFill?: boolean;
  /** Promote the panel heading and run action into the route-level header band. */
  headerPresentation?: AdminPanelHeaderPresentation;
  /** Adds the Hide/Show controls toggle: the run count and `headerSummary` collapse. The run action never does. */
  headerCollapsible?: AdminPanelBandOptions<{ total: number }>;
  /** Status content under the run count; collapses with it. */
  headerSummary?: ReactNode;
}

/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
export function OperationalJobsPanel({
  adapter,
  title = "Operational jobs",
  runLabel = "Run now",
  pageSize = 25,
  className,
  formatTimestamp,
  emptyState = { title: "No operational runs yet." },
  storageKey,
  tableFill,
  headerPresentation = "section",
  headerCollapsible,
  headerSummary,
}: OperationalJobsPanelProps) {
  const labels = useAdminLabels();
  const [result, setResult] = useState<{ items: readonly AdminOperationalJob[]; total: number }>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const latestLoadId = useRef(0);
  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    setIsLoading(true);
    try {
      setError(undefined);
      const next = await adapter.list({ page, pageSize });
      if (loadId === latestLoadId.current) setResult({ items: next.items, total: next.total });
    } catch (reason) {
      if (loadId === latestLoadId.current)
        setError(reason instanceof Error ? reason.message : "Unable to load operational jobs.");
    } finally {
      if (loadId === latestLoadId.current) setIsLoading(false);
    }
  }, [adapter, page, pageSize]);
  useEffect(() => {
    void load();
    // See BackupsPanel: invalidate synchronously with the transition so a
    // stale in-flight request for the previous page can't slip past the
    // loadId check before the effect for the new page has even started.
    return () => {
      latestLoadId.current += 1;
    };
  }, [load]);
  useEffect(() => {
    if (!result) return;
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [result, page, pageSize]);
  if (error && !result)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: error, onRetry: () => void load() }}
        className={className}
      />
    );
  if (!result)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading operational jobs…" }}
        className={className}
      />
    );
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const jobColumns: AdminDataTableColumn<AdminOperationalJob>[] = [
    {
      id: "job",
      header: "Job",
      minWidth: 224,
      cell: (item) => (
        <span>
          <strong>{item.label}</strong>
          {item.detail ? <small>{item.detail}</small> : null}
        </span>
      ),
    },
    {
      id: "started",
      header: "Started",
      defaultWidth: 184,
      minWidth: 128,
      cell: (item) => <span>{formatAdminTimestamp(item.startedAt, formatTimestamp)}</span>,
    },
    {
      id: "finished",
      header: "Finished",
      defaultWidth: 184,
      minWidth: 128,
      cell: (item) => (
        <span>
          {item.finishedAt ? formatAdminTimestamp(item.finishedAt, formatTimestamp) : "In progress"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      defaultWidth: 128,
      minWidth: 96,
      cell: (item) => (
        <span>
          <span className={`admin-kit__state-pill admin-kit__state-pill--${item.state}`}>
            {item.state}
          </span>
        </span>
      ),
    },
  ];
  return (
    <section
      className={["admin-kit__operations", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <AdminPanelHeader
        actions={
          adapter.run ? (
            <button
              disabled={busy}
              type="button"
              onClick={() =>
                void (async () => {
                  setBusy(true);
                  try {
                    await adapter.run!.execute();
                    await load();
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : "Unable to run the operational job.",
                    );
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              {runLabel}
            </button>
          ) : null
        }
        collapsible={panelHeaderCollapsible(
          headerCollapsible,
          { total: result.total },
          { summary: <span>{result.total.toLocaleString()} recent runs</span> },
        )}
        detail={<p>{result.total} recent runs</p>}
        presentation={headerPresentation}
        summary={headerSummary}
        title={title}
      />
      {error ? (
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      ) : null}
      {result.items.length === 0 ? (
        <AdminPanelStateView
          state={{ kind: "empty", title: emptyState.title, detail: emptyState.detail }}
        />
      ) : (
        <AdminDataTable
          busy={busy || isLoading}
          className="admin-kit__operations-table"
          columns={jobColumns}
          rowKey={(item) => item.id}
          rows={result.items}
          storageKey={storageKey}
          fill={tableFill}
          wrapClassName="admin-kit__operations-table-wrap"
        />
      )}
      {totalPages > 1 ? (
        <nav className="admin-kit__pagination" aria-label="Operational jobs pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {labels.previousPage}
          </button>
          <span>{labels.pageStatus(page, totalPages)}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {labels.nextPage}
          </button>
        </nav>
      ) : null}
    </section>
  );
}

export interface BackupsPanelProps {
  adapter: AdminBackupsAdapter;
  title?: string;
  runLabel?: string;
  pageSize?: number;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
  /** Overrides the default timestamp presentation for createdAt. */
  formatTimestamp?: (iso: string) => string;
  /** Persist this viewer's column widths under this key. */
  storageKey?: string;
  /** The table fills the viewport and scrolls itself under a pinned header (see `AdminDataTable` `fill`). */
  tableFill?: boolean;
}

export function BackupsPanel({
  adapter,
  title = "Backups",
  runLabel = "Run backup",
  pageSize = 25,
  className,
  formatTimestamp,
  storageKey,
  tableFill,
}: BackupsPanelProps) {
  const labels = useAdminLabels();
  const [result, setResult] = useState<{ items: readonly AdminBackupSummary[]; total: number }>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<AdminBackupSummary>();
  const latestLoadId = useRef(0);
  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    setIsLoading(true);
    try {
      setError(undefined);
      const next = await adapter.list({ page, pageSize });
      if (loadId === latestLoadId.current) setResult({ items: next.items, total: next.total });
    } catch (reason) {
      if (loadId === latestLoadId.current)
        setError(reason instanceof Error ? reason.message : "Unable to load backups.");
    } finally {
      if (loadId === latestLoadId.current) setIsLoading(false);
    }
  }, [adapter, page, pageSize]);
  const run = async () => {
    if (!adapter.run) return;
    setBusy(true);
    try {
      await adapter.run.execute();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to run backup.");
    } finally {
      setBusy(false);
    }
  };
  const restore = async (backupId: string) => {
    if (!adapter.restore) return;
    setBusy(true);
    try {
      await adapter.restore.execute({ backupId });
      await load();
      setRestoreTarget(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore backup.");
      setRestoreTarget(undefined);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
    // Invalidate synchronously with the transition (see load()'s loadId
    // guard): otherwise a stale in-flight request for the previous
    // page/adapter can resolve after the new query starts and still pass
    // the loadId check, because the effect that bumps it for the new page
    // hasn't run yet.
    return () => {
      latestLoadId.current += 1;
    };
  }, [load]);
  useEffect(() => {
    if (!result) return;
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [result, page, pageSize]);
  if (error && !result)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: error, onRetry: () => void load() }}
        className={className}
      />
    );
  if (!result)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading backups…" }}
        className={className}
      />
    );
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  const backupColumns: AdminDataTableColumn<AdminBackupSummary>[] = [
    {
      id: "backup",
      header: "Backup",
      minWidth: 224,
      cell: (item) => (
        <span>
          <strong>{item.label}</strong>
          {item.detail ? <small>{item.detail}</small> : null}
        </span>
      ),
    },
    {
      id: "created",
      header: "Created",
      defaultWidth: 184,
      minWidth: 128,
      cell: (item) => <span>{formatAdminTimestamp(item.createdAt, formatTimestamp)}</span>,
    },
    {
      id: "size",
      header: "Size",
      defaultWidth: 112,
      minWidth: 80,
      cell: (item) => <span>{item.size ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      defaultWidth: 128,
      minWidth: 96,
      cell: (item) => (
        <span>
          <span className={`admin-kit__state-pill admin-kit__state-pill--${item.state}`}>
            {item.state}
          </span>
        </span>
      ),
    },
    ...(adapter.restore
      ? [
          {
            id: "actions",
            header: "Actions",
            defaultWidth: 128,
            resizable: false,
            cell: (item: AdminBackupSummary) => (
              <button
                disabled={busy || item.state !== "completed"}
                type="button"
                onClick={() => setRestoreTarget(item)}
              >
                Restore
              </button>
            ),
          },
        ]
      : []),
  ];
  return (
    <section
      className={["admin-kit__operations", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <header>
        <div>
          <h2>{title}</h2>
          <p>{result.total} recent recovery points</p>
        </div>
        {adapter.run ? (
          <button
            className="admin-kit__button admin-kit__button--primary"
            disabled={busy}
            type="button"
            onClick={() => void run()}
          >
            {runLabel}
          </button>
        ) : null}
      </header>
      {error ? (
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      ) : null}
      {result.items.length === 0 ? (
        <AdminPanelStateView
          state={{
            kind: "empty",
            title: "No backups yet",
            detail: "Run a backup to create your first recovery point.",
          }}
        />
      ) : (
        <AdminDataTable
          busy={busy || isLoading}
          className="admin-kit__operations-table admin-kit__backups-table"
          columns={backupColumns}
          rowKey={(item) => item.id}
          rows={result.items}
          storageKey={storageKey}
          fill={tableFill}
          wrapClassName="admin-kit__operations-table-wrap admin-kit__backups-table-wrap"
        />
      )}
      {totalPages > 1 ? (
        <nav className="admin-kit__pagination" aria-label="Backups pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {labels.previousPage}
          </button>
          <span>{labels.pageStatus(page, totalPages)}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            {labels.nextPage}
          </button>
        </nav>
      ) : null}
      {adapter.restore ? (
        <AdminConfirmationDialog
          open={Boolean(restoreTarget)}
          title="Restore backup"
          description={
            restoreTarget
              ? `This will overwrite the current database with the recovery point "${restoreTarget.label}". This action is destructive and cannot be reversed.`
              : ""
          }
          confirmLabel="Restore backup"
          danger
          pending={busy}
          onCancel={() => setRestoreTarget(undefined)}
          onConfirm={() => restoreTarget && void restore(restoreTarget.id)}
        />
      ) : null}
    </section>
  );
}

export interface SettingsPanelProps {
  adapter: AdminSettingsAdapter;
  title?: string;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
}

export function SettingsPanel({ adapter, title = "Settings", className }: SettingsPanelProps) {
  const [fields, setFields] = useState<readonly AdminSettingField[]>();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const latestLoadId = useRef(0);
  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    // A failed load under the new adapter must not fall through to
    // displaying the previous adapter's fields, and a retried or
    // newly-successful load must not leave a stale error behind.
    setFields(undefined);
    setError(undefined);
    try {
      const next = await adapter.load();
      if (loadId !== latestLoadId.current) return;
      const loaded = Object.fromEntries(next.map((field) => [field.id, field.value]));
      setFields(next);
      setValues(loaded);
      setInitialValues(loaded);
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setError(reason instanceof Error ? reason.message : "Unable to load settings.");
      }
    }
  }, [adapter]);
  useEffect(() => {
    void load();
    // Invalidate synchronously with the transition: without this, a request
    // in flight for the previous adapter can still resolve and pass the
    // `loadId === latestLoadId.current` check because the effect that would
    // have bumped it for the new adapter hasn't started yet.
    return () => {
      latestLoadId.current += 1;
    };
  }, [load]);
  if (error && !fields)
    return (
      <AdminPanelStateView
        state={{ kind: "error", detail: error, onRetry: () => void load() }}
        className={className}
      />
    );
  if (!fields)
    return (
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading settings…" }}
        className={className}
      />
    );
  const dirty = Object.keys(values).some((key) => values[key] !== initialValues[key]);
  const save = async () => {
    setSaving(true);
    setSaved(false);
    setError(undefined);
    try {
      await adapter.save.execute({ values });
      setInitialValues(values);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form
      className={["admin-kit__settings", className].filter(Boolean).join(" ")}
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <header>
        <div>
          <h2>{title}</h2>
          <p>Changes are applied when saved.</p>
        </div>
        <button disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</button>
      </header>
      <p aria-live="polite" className="admin-kit__settings-feedback">
        {saved ? "Changes saved." : null}
      </p>
      {error ? <AdminPanelStateView state={{ kind: "error", detail: error }} /> : null}
      {fields.map((field) =>
        field.type === "boolean" ? (
          <AdminSwitch
            checked={Boolean(values[field.id])}
            className="admin-kit__settings-toggle"
            description={field.description}
            key={field.id}
            label={field.label}
            onClick={() => {
              setSaved(false);
              setValues((current) => ({ ...current, [field.id]: !current[field.id] }));
            }}
            statusLabel={values[field.id] ? "Enabled" : "Disabled"}
          />
        ) : (
          <label key={field.id}>
            <span>{field.label}</span>
            {field.description ? <small>{field.description}</small> : null}
            <input
              type={field.sensitive ? "password" : "text"}
              value={String(values[field.id] ?? "")}
              onChange={(event) => {
                setSaved(false);
                setValues((current) => ({ ...current, [field.id]: event.target.value }));
              }}
            />
          </label>
        ),
      )}
    </form>
  );
}
