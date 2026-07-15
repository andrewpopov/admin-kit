import { useEffect, useRef, useState } from "react";
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
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import { AdminPanelStateView } from "./AdminPanelState";
import { AdminSwitch } from "./AdminPrimitives";

export interface AdminStatusSummaryProps {
  items: readonly AdminOperationalStatus[];
}

export function AdminStatusSummary({ items }: AdminStatusSummaryProps) { return <dl className="admin-kit__status-summary">{items.map(item => <div className={`admin-kit__status admin-kit__status--${item.tone ?? "neutral"}`} key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.detail ? <small>{item.detail}</small> : null}</div>)}</dl>; }

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
}

/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
export function OperationalJobsPanel({ adapter, title = "Operational jobs", runLabel = "Run now", pageSize = 25, className, formatTimestamp, emptyState = { title: "No operational runs yet." } }: OperationalJobsPanelProps) {
  const [result, setResult] = useState<{ items: readonly AdminOperationalJob[]; total: number }>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const latestLoadId = useRef(0);
  const load = async () => {
    const loadId = ++latestLoadId.current;
    try {
      setError(undefined);
      const next = await adapter.list({ page, pageSize });
      if (loadId === latestLoadId.current) setResult({ items: next.items, total: next.total });
    } catch (reason) {
      if (loadId === latestLoadId.current) setError(reason instanceof Error ? reason.message : "Unable to load operational jobs.");
    }
  };
  useEffect(() => {
    void load();
    // See BackupsPanel: invalidate synchronously with the transition so a
    // stale in-flight request for the previous page can't slip past the
    // loadId check before the effect for the new page has even started.
    return () => { latestLoadId.current += 1; };
  }, [adapter, page, pageSize]);
  useEffect(() => {
    if (!result) return;
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [result, page, pageSize]);
  if (error && !result) return <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} className={className} />;
  if (!result) return <AdminPanelStateView state={{ kind: "loading", label: "Loading operational jobs…" }} className={className} />;
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  return <section className={["admin-kit__operations", className].filter(Boolean).join(" ")} aria-label={title}><header><div><h2>{title}</h2><p>{result.total} recent runs</p></div>{adapter.run ? <button disabled={busy} type="button" onClick={() => void (async () => { setBusy(true); try { await adapter.run!.execute(); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run the operational job."); } finally { setBusy(false); } })()}>{runLabel}</button> : null}</header>{error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}{result.items.length === 0 ? <AdminPanelStateView state={{ kind: "empty", title: emptyState.title, detail: emptyState.detail }} /> : <div className="admin-kit__table-wrap admin-kit__operations-table-wrap"><table className="admin-kit__table admin-kit__operations-table" aria-busy={busy}><thead><tr><th scope="col">Job</th><th scope="col">Started</th><th scope="col">Finished</th><th scope="col">Status</th></tr></thead><tbody>{result.items.map(item => <tr key={item.id}><td><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</td><td>{formatAdminTimestamp(item.startedAt, formatTimestamp)}</td><td>{item.finishedAt ? formatAdminTimestamp(item.finishedAt, formatTimestamp) : "In progress"}</td><td><span className={`admin-kit__state-pill admin-kit__state-pill--${item.state}`}>{item.state}</span></td></tr>)}</tbody></table></div>}{totalPages > 1 ? (
    <nav className="admin-kit__pagination" aria-label="Operational jobs pagination">
      <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </nav>
  ) : null}</section>;
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
}

export function BackupsPanel({ adapter, title = "Backups", runLabel = "Run backup", pageSize = 25, className, formatTimestamp }: BackupsPanelProps) {
  const [result, setResult] = useState<{ items: readonly AdminBackupSummary[]; total: number }>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<AdminBackupSummary>();
  const latestLoadId = useRef(0);
  const load = async () => {
    const loadId = ++latestLoadId.current;
    try {
      setError(undefined);
      const next = await adapter.list({ page, pageSize });
      if (loadId === latestLoadId.current) setResult({ items: next.items, total: next.total });
    } catch (reason) {
      if (loadId === latestLoadId.current) setError(reason instanceof Error ? reason.message : "Unable to load backups.");
    }
  };
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
    return () => { latestLoadId.current += 1; };
  }, [adapter, page, pageSize]);
  useEffect(() => {
    if (!result) return;
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [result, page, pageSize]);
  if (error && !result) return <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} className={className} />;
  if (!result) return <AdminPanelStateView state={{ kind: "loading", label: "Loading backups…" }} className={className} />;
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
  return <section className={["admin-kit__operations", className].filter(Boolean).join(" ")} aria-label={title}><header><div><h2>{title}</h2><p>{result.total} recent recovery points</p></div>{adapter.run ? <button disabled={busy} type="button" onClick={() => void run()}>{runLabel}</button> : null}</header>{error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}<div className="admin-kit__table-wrap admin-kit__operations-table-wrap"><table className="admin-kit__table admin-kit__operations-table" aria-busy={busy}><thead><tr><th scope="col">Backup</th><th scope="col">Created</th><th scope="col">Size</th><th scope="col">Status</th>{adapter.restore ? <th scope="col">Actions</th> : null}</tr></thead><tbody>{result.items.map(item => <tr key={item.id}><td><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</td><td>{formatAdminTimestamp(item.createdAt, formatTimestamp)}</td><td>{item.size ?? "—"}</td><td><span className={`admin-kit__state-pill admin-kit__state-pill--${item.state}`}>{item.state}</span></td>{adapter.restore ? <td><button disabled={busy || item.state !== "completed"} type="button" onClick={() => setRestoreTarget(item)}>Restore</button></td> : null}</tr>)}</tbody></table></div>{totalPages > 1 ? (
    <nav className="admin-kit__pagination" aria-label="Backups pagination">
      <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} of {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
    </nav>
  ) : null}{adapter.restore ? <AdminConfirmationDialog open={Boolean(restoreTarget)} title="Restore backup" description={restoreTarget ? `This will overwrite the current database with the recovery point "${restoreTarget.label}". This action is destructive and cannot be reversed.` : ""} confirmLabel="Restore backup" danger pending={busy} onCancel={() => setRestoreTarget(undefined)} onConfirm={() => restoreTarget && void restore(restoreTarget.id)} /> : null}</section>;
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
  useEffect(() => { void adapter.load().then(next => { const loaded = Object.fromEntries(next.map(field => [field.id, field.value])); setFields(next); setValues(loaded); setInitialValues(loaded); }).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load settings.")); }, [adapter]);
  if (error && !fields) return <AdminPanelStateView state={{ kind: "error", detail: error }} className={className} />;
  if (!fields) return <AdminPanelStateView state={{ kind: "loading", label: "Loading settings…" }} className={className} />;
  const dirty = Object.keys(values).some(key => values[key] !== initialValues[key]);
  const save = async () => { setSaving(true); setSaved(false); setError(undefined); try { await adapter.save.execute({ values }); setInitialValues(values); setSaved(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save settings."); } finally { setSaving(false); } };
  return <form className={["admin-kit__settings", className].filter(Boolean).join(" ")} aria-label={title} onSubmit={event => { event.preventDefault(); void save(); }}><header><div><h2>{title}</h2><p>Changes are applied when saved.</p></div><button disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</button></header><p aria-live="polite" className="admin-kit__settings-feedback">{saved ? "Changes saved." : null}</p>{error ? <AdminPanelStateView state={{ kind: "error", detail: error }} /> : null}{fields.map(field => field.type === "boolean" ? <AdminSwitch checked={Boolean(values[field.id])} className="admin-kit__settings-toggle" description={field.description} key={field.id} label={field.label} onClick={() => { setSaved(false); setValues(current => ({ ...current, [field.id]: !Boolean(current[field.id]) })); }} statusLabel={Boolean(values[field.id]) ? "Enabled" : "Disabled"} /> : <label key={field.id}><span>{field.label}</span>{field.description ? <small>{field.description}</small> : null}<input type={field.sensitive ? "password" : "text"} value={String(values[field.id] ?? "")} onChange={event => { setSaved(false); setValues(current => ({ ...current, [field.id]: event.target.value })); }} /></label>)}</form>;
}
