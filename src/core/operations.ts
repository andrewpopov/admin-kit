import type { AdminPage } from "./contracts";

export type AdminHealthTone = "healthy" | "warning" | "critical" | "neutral";
export interface AdminOperationalStatus { label: string; value: string; tone?: AdminHealthTone; detail?: string; }
export interface AdminBackupSummary { id: string; label: string; createdAt: string; size?: string; state: "completed" | "running" | "failed"; detail?: string; }
export interface AdminBackupsAdapter {
  list(query: { page?: number; pageSize?: number }): Promise<AdminPage<AdminBackupSummary>>;
  run?: { execute(): Promise<void> };
  restore?: { execute(input: { backupId: string }): Promise<void> };
}

export interface AdminSettingField { id: string; label: string; description?: string; value: string | boolean; type?: "text" | "boolean"; sensitive?: boolean; }
export interface AdminSettingsAdapter { load(): Promise<readonly AdminSettingField[]>; save: { execute(input: { values: Record<string, string | boolean> }): Promise<void> }; }
export interface AdminOperationalJob {
  id: string;
  label: string;
  startedAt: string;
  finishedAt?: string;
  state: "completed" | "running" | "failed";
  detail?: string;
}
export interface AdminOperationalJobsAdapter {
  list(query: { page?: number; pageSize?: number }): Promise<AdminPage<AdminOperationalJob>>;
  run?: { execute(): Promise<void> };
}
