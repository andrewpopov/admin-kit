/** Read-only product updates. Hosts admit every signed-in user, independently of admin roles. */
export interface ReleaseNoteSummary {
  id: string;
  product: string;
  version: string;
  releasedAt: string;
  summary: string;
}

export interface ReleaseNoteDetail extends ReleaseNoteSummary {
  notesMarkdown: string;
}

export interface ReleaseNotesPage {
  items: ReleaseNoteSummary[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ReleaseNotesAdapter {
  list(query: { page: number; pageSize: number }): Promise<ReleaseNotesPage>;
  get(id: string): Promise<ReleaseNoteDetail | null>;
}

export function validateReleaseNote(value: unknown): ReleaseNoteSummary {
  if (typeof value !== "object" || value === null) throw new Error("Invalid release note.");
  const r = value as Record<string, unknown>;
  for (const key of ["id", "product", "version", "releasedAt", "summary"] as const) {
    if (typeof r[key] !== "string" || !r[key].trim()) throw new Error(`Invalid release ${key}.`);
  }
  if (!Number.isFinite(Date.parse(r.releasedAt as string)))
    throw new Error("Invalid release date.");
  return {
    id: r.id as string,
    product: r.product as string,
    version: r.version as string,
    releasedAt: r.releasedAt as string,
    summary: r.summary as string,
  };
}

export function validateReleaseNoteDetail(value: unknown): ReleaseNoteDetail {
  const summary = validateReleaseNote(value);
  const markdown = (value as Record<string, unknown>).notesMarkdown;
  if (typeof markdown !== "string" || !markdown.trim()) throw new Error("Invalid release notes.");
  return { ...summary, notesMarkdown: markdown };
}

export function validateReleaseNotesPage(value: unknown): ReleaseNotesPage {
  if (typeof value !== "object" || value === null) throw new Error("Invalid release page.");
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    typeof page.hasMore !== "boolean" ||
    !Number.isSafeInteger(page.page) ||
    (page.page as number) < 1 ||
    !Number.isSafeInteger(page.pageSize) ||
    (page.pageSize as number) < 1 ||
    (page.pageSize as number) > 50 ||
    page.items.length > (page.pageSize as number)
  )
    throw new Error("Invalid release page.");
  return {
    items: page.items.map(validateReleaseNote),
    page: page.page as number,
    pageSize: page.pageSize as number,
    hasMore: page.hasMore,
  };
}
