"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  validateReleaseNoteDetail,
  validateReleaseNotesPage,
  type ReleaseNoteDetail,
  type ReleaseNotesAdapter,
  type ReleaseNotesPage,
} from "../core/releaseNotes";
import { AdminPanelStateView } from "./AdminPanelState";
import { AdminTheme } from "./AdminTheme";

export interface ReleaseNotesPanelProps {
  adapter: ReleaseNotesAdapter;
  /** Omit for the history index; set from the host's detail route for a durable deep link. */
  releaseId?: string;
  hrefForRelease: (id: string) => string;
  listHref: string;
  /** Host's Markdown renderer must escape raw HTML and reject unsafe URL schemes. */
  renderNotes: (markdown: string) => ReactNode;
  renderLink?: (href: string, children: ReactNode) => ReactNode;
  pageSize?: number;
  title?: string;
}

type State = { key: string } & (
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "list"; data: ReleaseNotesPage }
  | { kind: "detail"; data: ReleaseNoteDetail }
);

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(value),
  );
}

/** Mount in the product's signed-in shell, without an AdminApp or an admin-role gate. */
export function ReleaseNotesPanel({
  adapter,
  releaseId,
  hrefForRelease,
  listHref,
  renderNotes,
  renderLink = (href, children) => <a href={href}>{children}</a>,
  pageSize = 10,
  title = "What's new",
}: ReleaseNotesPanelProps) {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
    throw new Error("Invalid release page size.");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([releaseId, page, pageSize, retry]);
  const [state, setState] = useState<State>({ key, kind: "loading" });
  useEffect(() => {
    let current = true;
    setState({ key, kind: "loading" });
    const load = async () => {
      try {
        if (releaseId !== undefined) {
          const data = await adapter.get(releaseId);
          if (current)
            setState(
              data === null
                ? { key, kind: "missing" }
                : { key, kind: "detail", data: validateReleaseNoteDetail(data) },
            );
        } else {
          const data = validateReleaseNotesPage(await adapter.list({ page, pageSize }));
          if (data.page !== page || data.pageSize !== pageSize)
            throw new Error("Mismatched release page.");
          if (current) setState({ key, kind: "list", data });
        }
      } catch {
        if (current) setState({ key, kind: "error" });
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [adapter, releaseId, page, pageSize, key]);
  const view = state.key === key ? state : { kind: "loading" as const };

  return (
    <AdminTheme>
      <section className="admin-kit__release-notes" aria-label={title}>
        {releaseId !== undefined ? (
          <div className="admin-kit__release-back">{renderLink(listHref, "All updates")}</div>
        ) : null}
        {view.kind === "loading" ? (
          <AdminPanelStateView
            state={{ kind: "loading", label: "Loading release notes…", skeletonRows: 3 }}
          />
        ) : null}
        {view.kind === "error" ? (
          <AdminPanelStateView
            state={{
              kind: "error",
              title: "Couldn't load release notes",
              detail: "Try again in a moment.",
              onRetry: () => setRetry((value) => value + 1),
            }}
          />
        ) : null}
        {view.kind === "missing" ? (
          <AdminPanelStateView
            state={{
              kind: "empty",
              title: "Release notes not found",
              detail: "Choose another update from the history.",
            }}
          />
        ) : null}
        {view.kind === "detail" ? (
          <article>
            <time className="admin-kit__release-date" dateTime={view.data.releasedAt}>
              {dateLabel(view.data.releasedAt)}
            </time>
            <h2>
              {view.data.product} {view.data.version}
            </h2>
            <p className="admin-kit__release-summary">{view.data.summary}</p>
            <div className="admin-kit__release-body">{renderNotes(view.data.notesMarkdown)}</div>
          </article>
        ) : null}
        {view.kind === "list" ? (
          <>
            {view.data.items.length === 0 ? (
              <AdminPanelStateView
                state={{
                  kind: "empty",
                  title: "No updates yet",
                  detail: "Release notes will appear here when an update ships.",
                }}
              />
            ) : (
              <ol className="admin-kit__release-list">
                {view.data.items.map((note) => (
                  <li key={note.id}>
                    <article>
                      <time className="admin-kit__release-date" dateTime={note.releasedAt}>
                        {dateLabel(note.releasedAt)}
                      </time>
                      <h2>
                        {note.product} {note.version}
                      </h2>
                      <p>{note.summary}</p>
                      {renderLink(hrefForRelease(note.id), "Full release notes")}
                    </article>
                  </li>
                ))}
              </ol>
            )}
            {page > 1 || view.data.hasMore ? (
              <nav className="admin-kit__release-paging" aria-label="Release history pages">
                <button
                  type="button"
                  className="admin-kit__button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Newer
                </button>
                <span aria-live="polite">Page {page}</span>
                <button
                  type="button"
                  className="admin-kit__button"
                  disabled={!view.data.hasMore}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Older
                </button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
    </AdminTheme>
  );
}
