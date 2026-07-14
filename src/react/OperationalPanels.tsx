import { useEffect, useState } from "react";
import type { AdminBackupsAdapter, AdminOperationalJobsAdapter, AdminOperationalStatus, AdminSettingsAdapter, AdminSettingField } from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

export function AdminStatusSummary({ items }: { items: readonly AdminOperationalStatus[] }) { return <dl className="admin-kit__status-summary">{items.map(item => <div className={`admin-kit__status admin-kit__status--${item.tone ?? "neutral"}`} key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd>{item.detail ? <small>{item.detail}</small> : null}</div>)}</dl>; }

/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
export function OperationalJobsPanel({ adapter, title = "Operational jobs", runLabel = "Run now" }: { adapter: AdminOperationalJobsAdapter; title?: string; runLabel?: string }) {
  const [items, setItems] = useState<readonly import("../core").AdminOperationalJob[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setError(undefined); setItems((await adapter.list({ page: 1, pageSize: 25 })).items); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load operational jobs."); } };
  useEffect(() => { void load(); }, [adapter]);
  if (error && !items) return <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />;
  if (!items) return <AdminPanelStateView state={{ kind: "loading", label: "Loading operational jobs…" }} />;
  return <section className="admin-kit__operations" aria-label={title}><header><div><h2>{title}</h2><p>{items.length} recent runs</p></div>{adapter.run ? <button disabled={busy} type="button" onClick={() => void (async () => { setBusy(true); try { await adapter.run!.execute(); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run the operational job."); } finally { setBusy(false); } })()}>{runLabel}</button> : null}</header>{error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}<div className="admin-kit__table-wrap admin-kit__operations-table-wrap"><table className="admin-kit__table admin-kit__operations-table" aria-busy={busy}><thead><tr><th scope="col">Job</th><th scope="col">Started</th><th scope="col">Finished</th><th scope="col">Status</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</td><td>{item.startedAt}</td><td>{item.finishedAt ?? "In progress"}</td><td><span className={`admin-kit__state-pill admin-kit__state-pill--${item.state}`}>{item.state}</span></td></tr>)}</tbody></table></div></section>;
}

export function BackupsPanel({ adapter, title = "Backups" }: { adapter: AdminBackupsAdapter; title?: string }) {
  const [items, setItems] = useState<readonly import("../core").AdminBackupSummary[]>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      setError(undefined);
      setItems((await adapter.list({ page: 1, pageSize: 25 })).items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load backups.");
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to restore backup.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void load(); }, [adapter]);
  if (error && !items) return <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />;
  if (!items) return <AdminPanelStateView state={{ kind: "loading", label: "Loading backups…" }} />;
  return <section className="admin-kit__operations" aria-label={title}><header><div><h2>{title}</h2><p>{items.length} recent recovery points</p></div>{adapter.run ? <button disabled={busy} type="button" onClick={() => void run()}>Run backup</button> : null}</header>{error ? <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} /> : null}<div className="admin-kit__table-wrap admin-kit__operations-table-wrap"><table className="admin-kit__table admin-kit__operations-table" aria-busy={busy}><thead><tr><th scope="col">Backup</th><th scope="col">Created</th><th scope="col">Size</th><th scope="col">Status</th>{adapter.restore ? <th scope="col">Actions</th> : null}</tr></thead><tbody>{items.map(item => <tr key={item.id}><td><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</td><td>{item.createdAt}</td><td>{item.size ?? "—"}</td><td><span className={`admin-kit__state-pill admin-kit__state-pill--${item.state}`}>{item.state}</span></td>{adapter.restore ? <td><button disabled={busy || item.state !== "completed"} type="button" onClick={() => void restore(item.id)}>Restore</button></td> : null}</tr>)}</tbody></table></div></section>;
}

export function SettingsPanel({ adapter, title = "Settings" }: { adapter: AdminSettingsAdapter; title?: string }) {
  const [fields, setFields] = useState<readonly AdminSettingField[]>();
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => { void adapter.load().then(next => { const loaded = Object.fromEntries(next.map(field => [field.id, field.value])); setFields(next); setValues(loaded); setInitialValues(loaded); }).catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load settings.")); }, [adapter]);
  if (error && !fields) return <AdminPanelStateView state={{ kind: "error", detail: error }} />;
  if (!fields) return <AdminPanelStateView state={{ kind: "loading", label: "Loading settings…" }} />;
  const dirty = Object.keys(values).some(key => values[key] !== initialValues[key]);
  const save = async () => { setSaving(true); setSaved(false); setError(undefined); try { await adapter.save.execute({ values }); setInitialValues(values); setSaved(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save settings."); } finally { setSaving(false); } };
  return <form className="admin-kit__settings" aria-label={title} onSubmit={event => { event.preventDefault(); void save(); }}><header><div><h2>{title}</h2><p>Changes are applied when saved.</p></div><button disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</button></header><p aria-live="polite" className="admin-kit__settings-feedback">{saved ? "Changes saved." : null}</p>{error ? <AdminPanelStateView state={{ kind: "error", detail: error }} /> : null}{fields.map(field => <label key={field.id}><span>{field.label}</span>{field.description ? <small>{field.description}</small> : null}{field.type === "boolean" ? <input type="checkbox" checked={Boolean(values[field.id])} onChange={event => { setSaved(false); setValues(current => ({ ...current, [field.id]: event.target.checked })); }} /> : <input type={field.sensitive ? "password" : "text"} value={String(values[field.id] ?? "")} onChange={event => { setSaved(false); setValues(current => ({ ...current, [field.id]: event.target.value })); }} />}</label>)}</form>;
}
