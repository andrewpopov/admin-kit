"use client";
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  type ElementType,
  type ReactNode,
} from "react";
import { useBandCollapsed, type AdminBandDefault } from "./adminPanelBand";

/**
 * `"section"` renders an `h2` title band; `"page"` renders an `h1` title band
 * for panel-led routes. `"none"` means the HOST owns the entire band — title,
 * actions AND toolbar — because `AdminPanelHeader` renders nothing at all.
 * A host that passes `actions` or `toolbar` alongside `presentation="none"`
 * will not see them: the band that would render them doesn't exist. The host
 * is responsible for rendering its own title, actions, and toolbar, and for
 * naming the panel's section (e.g. `aria-label={title}`) since no heading is
 * rendered.
 */
export type AdminPanelHeaderPresentation = "section" | "page" | "none";

const AdminFrameHeadingContext = createContext(false);

/**
 * Marks that an application frame already renders the page's `h1`, so a
 * `presentation="page"` panel title becomes an `h2` (same look) and the page
 * keeps exactly one `h1`.
 */
export const AdminFrameHeadingProvider = AdminFrameHeadingContext.Provider;

export interface AdminPanelHeaderCollapsible {
  /** Names the page; the choice is stored per viewer under `admin-kit:header:<storageKey>:<regular|compact>`. */
  storageKey: string;
  /** Shown in the title row while the region is collapsed; carries applied-filter chips. */
  collapsedSummary: ReactNode;
  /** Applied filters; appended to the collapsed toggle's label. */
  activeCount?: number;
  /** `"auto"` collapses below 64rem wide or 45rem tall. */
  defaultCollapsed?: AdminBandDefault;
}

/** What a kit panel asks of its own header band; the panel supplies the summary content. */
export interface AdminPanelBandOptions<Context> {
  storageKey: string;
  defaultCollapsed?: AdminBandDefault;
  /** Applied filters the host owns, added to the panel's own count. */
  activeCount?: number;
  renderCollapsedSummary?: (context: Context) => ReactNode;
}

export function panelHeaderCollapsible<Context>(
  options: AdminPanelBandOptions<Context> | undefined,
  context: Context | undefined,
  own: { summary: ReactNode; activeCount?: number },
): AdminPanelHeaderCollapsible | undefined {
  if (!options) return undefined;
  return {
    storageKey: options.storageKey,
    defaultCollapsed: options.defaultCollapsed,
    activeCount: (own.activeCount ?? 0) + (options.activeCount ?? 0),
    collapsedSummary:
      options.renderCollapsedSummary && context !== undefined
        ? options.renderCollapsedSummary(context)
        : own.summary,
  };
}

const AdminBandContext = createContext<{ focusToggle: () => void } | undefined>(undefined);

/** Lets a control inside the collapsed summary hand focus back to the band's toggle after it acts. */
export function useAdminBandFocus(): () => void {
  return useContext(AdminBandContext)?.focusToggle ?? noop;
}

function noop() {}

export interface AdminPanelHeaderProps {
  title: string;
  presentation?: AdminPanelHeaderPresentation;
  /** A description or count line; collapses with the region when `collapsible` is set. */
  detail?: ReactNode;
  /** Status tiles or a status line between `detail` and `toolbar`; collapses with the region. */
  summary?: ReactNode;
  actions?: ReactNode;
  /** Search, filters, and secondary controls grouped below the title band. */
  toolbar?: ReactNode;
  /** Adds a Hide/Show controls toggle that collapses `detail`, `summary` and `toolbar`. The title and `actions` never collapse. */
  collapsible?: AdminPanelHeaderCollapsible;
  className?: string;
}

/**
 * One title/action band shared by standalone panels and panel-led pages.
 * Renders nothing when `presentation="none"` — see the contract documented
 * on {@link AdminPanelHeaderPresentation}.
 */
export function AdminPanelHeader({
  title,
  presentation = "section",
  detail,
  summary,
  actions,
  toolbar,
  collapsible,
  className,
}: AdminPanelHeaderProps) {
  const frameOwnsH1 = useContext(AdminFrameHeadingContext);
  const regionId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [collapsed, setCollapsed] = useBandCollapsed(
    collapsible?.storageKey,
    collapsible?.defaultCollapsed,
  );
  const bandFocus = useMemo(() => ({ focusToggle: () => toggleRef.current?.focus() }), []);
  if (presentation === "none") return null;

  const Heading = (presentation === "page" && !frameOwnsH1 ? "h1" : "h2") as ElementType;

  const hasRegion = Boolean(detail || summary || toolbar);
  const band = collapsible && hasRegion ? collapsible : undefined;
  const activeCount = band?.activeCount ?? 0;
  const regionContent = (
    <>
      {summary ? <div className="admin-kit__panel-header-summary">{summary}</div> : null}
      {toolbar ? <div className="admin-kit__panel-toolbar">{toolbar}</div> : null}
    </>
  );

  return (
    <header
      className={[
        "admin-kit__panel-header",
        `admin-kit__panel-header--${presentation}`,
        toolbar ? "admin-kit__panel-header--with-toolbar" : undefined,
        band ? "admin-kit__panel-header--collapsible" : undefined,
        band && collapsed ? "admin-kit__panel-header--collapsed" : undefined,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="admin-kit__panel-header-main">
        <div>
          <Heading>{title}</Heading>
          {band ? null : detail}
        </div>
        {band && collapsed ? (
          <AdminBandContext.Provider value={bandFocus}>
            <div className="admin-kit__panel-header-summary-line">{band.collapsedSummary}</div>
          </AdminBandContext.Provider>
        ) : null}
        {actions ? <div className="admin-kit__panel-header-actions">{actions}</div> : null}
        {band ? (
          <button
            aria-controls={regionId}
            aria-expanded={!collapsed}
            className="admin-kit__panel-header-toggle"
            onClick={() => setCollapsed(!collapsed)}
            ref={toggleRef}
            type="button"
          >
            <svg aria-hidden="true" focusable="false" height="16" viewBox="0 0 16 16" width="16">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" />
            </svg>
            <span className="admin-kit__panel-header-toggle-label">
              {collapsed ? "Show controls" : "Hide controls"}
            </span>
            {collapsed && activeCount > 0 ? (
              <>
                <span aria-hidden="true">({activeCount})</span>
                <span className="admin-kit__visually-hidden">
                  , {activeCount} {activeCount === 1 ? "filter" : "filters"} applied
                </span>
              </>
            ) : null}
          </button>
        ) : null}
      </div>
      {band ? (
        <div
          aria-label="Page controls"
          className="admin-kit__panel-header-region"
          hidden={collapsed}
          id={regionId}
          role="group"
        >
          {detail}
          {regionContent}
        </div>
      ) : (
        regionContent
      )}
    </header>
  );
}
