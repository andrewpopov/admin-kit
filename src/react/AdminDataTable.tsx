"use client";
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { AdminMobileCellLabel } from "./AdminTablePrimitives";
import { useFillBox } from "./useFillBox";
import { useHeaderFloors } from "./useHeaderFloors";
import {
  clamp,
  columnBounds,
  DETAILS_COLUMN_WIDTH,
  NARROW_CARD_WIDTH,
  resolveTableFit,
  type AdminDataTableColumnPriority,
} from "./adminDataTableFit";

export type { AdminDataTableColumnPriority } from "./adminDataTableFit";

const KEYBOARD_STEP = 16;
const KEYBOARD_LARGE_STEP = 64;
const MENU_STEP = 32;
const DRAG_THRESHOLD = 4;
const STORAGE_PREFIX = "admin-kit:table-widths:";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const SORT_ARROWS = { ascending: "↑", descending: "↓", none: "↕" } as const;

export interface AdminDataTableColumn<Row> {
  id: string;
  /** Accessible column name; also the resize handle name. */
  header: string;
  /** Visible heading and phone-card label when it needs more than the plain `header` text. */
  headerContent?: ReactNode;
  headerClassName?: string;
  /** Turns the heading into a sort button and sets `aria-sort`. */
  sort?: { direction: "ascending" | "descending" | "none"; onSort: () => void };
  cell: (row: Row) => ReactNode;
  /** px. A preferred width that shrinks to `minWidth` to fit the container. Omit on one column to make it fill the width the sized columns leave. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** px. The fill column's (no `defaultWidth`) preferred width, default 280: sized columns shrink toward their `minWidth` before it drops below this. */
  fillWidth?: number;
  resizable?: boolean;
  /** One line with an ellipsis; pair with `title` and `renderDetails` so the full value stays reachable. */
  truncate?: boolean;
  title?: (row: Row) => string | undefined;
  className?: string;
  /** Hides tertiary, then secondary, columns before anything scrolls. Default primary. */
  priority?: AdminDataTableColumnPriority;
  /** Where the cell sits in a stacked card; cells without a slot keep the label/value layout. */
  cardSlot?: "title" | "badge" | "meta" | "detail" | "actions";
}

export interface AdminDataTableProps<Row> {
  columns: readonly AdminDataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  label?: string;
  /** Persists column widths per viewer in localStorage. */
  storageKey?: string;
  busy?: boolean;
  /** Adds a disclosure column whose button expands a full-width row with this content. */
  renderDetails?: (row: Row) => ReactNode;
  detailsLabel?: string;
  /** Controls which `renderDetails` rows are open; omit to let the table keep that state. */
  expandedKeys?: readonly string[];
  onExpandedChange?: (keys: readonly string[]) => void;
  /** Marks a row's `<tr>` aria-busy, for rows with a pending action. */
  rowBusy?: (row: Row) => boolean;
  /** Content for a full-width row under the row, shown while it returns a value; the caller controls when. */
  renderExpansion?: (row: Row) => ReactNode;
  rowLabel?: (row: Row) => string;
  className?: string;
  wrapClassName?: string;
  /** Sizes the table to the viewport (its top down to what sits below it, such as pagination and the frame's padding) so it scrolls itself under a pinned header and the page does not. Stacked cards keep the page flow. */
  fill?: boolean;
}

type Widths = Record<string, number>;

/** True for content that paints nothing: null, booleans, '' and fragments of those. */
function isEmptyNode(node: ReactNode): boolean {
  return Children.toArray(node).every((child) => {
    if (child === "") return true;
    return isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
      ? isEmptyNode(child.props.children)
      : false;
  });
}

function readStoredWidths(storageKey: string | undefined): Widths {
  if (!storageKey || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function writeStoredWidths(storageKey: string | undefined, widths: Widths) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    if (Object.keys(widths).length === 0)
      window.localStorage.removeItem(STORAGE_PREFIX + storageKey);
    else window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(widths));
  } catch {
    // Storage is optional: the widths still apply for this visit.
  }
}

/** Resizable, sticky-header data table that fits its container: columns shrink, low-priority ones hide, and rows become cards when the primary columns cannot fit. */
export function AdminDataTable<Row>({
  columns,
  rows,
  rowKey,
  label,
  storageKey,
  busy = false,
  renderDetails,
  detailsLabel = "Details",
  expandedKeys,
  onExpandedChange,
  rowBusy,
  renderExpansion,
  rowLabel,
  className,
  wrapClassName,
  fill = false,
}: AdminDataTableProps<Row>) {
  const idPrefix = useId();
  const [stored, setStored] = useState(() => ({
    key: storageKey,
    widths: readStoredWidths(storageKey),
  }));
  if (stored.key !== storageKey) {
    setStored({ key: storageKey, widths: readStoredWidths(storageKey) });
  }
  const overrides = stored.key === storageKey ? stored.widths : {};
  const latest = useRef(overrides);
  latest.current = overrides;
  const [expandedState, setExpandedState] = useState<readonly string[]>([]);
  const expanded = expandedKeys ?? expandedState;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const drag = useRef<{ id: string; startX: number; startWidth: number }>();
  const dragged = useRef(false);
  const handles = useRef(new Map<string, HTMLElement>());
  const [menuFor, setMenuFor] = useState<string>();

  useEffect(() => {
    if (menuFor === undefined) return;
    document.getElementById(`${idPrefix}-resize-${menuFor}`)?.querySelector("button")?.focus();
    const closeOutside = (event: globalThis.PointerEvent) => {
      const owner = event.target instanceof Element && event.target.closest("[data-resize-column]");
      if (!owner || owner.getAttribute("data-resize-column") !== menuFor) setMenuFor(undefined);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [idPrefix, menuFor]);

  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => setContainerWidth(wrap.clientWidth || undefined);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const fillBox = useFillBox(wrapRef, fill);
  const [headHeight, setHeadHeight] = useState(0);
  useIsomorphicLayoutEffect(() => {
    const head = wrapRef.current?.querySelector("thead");
    if (!head) return undefined;
    const measure = () => setHeadHeight(head.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  const headerFloors = useHeaderFloors(
    wrapRef,
    columns.map((column) => ({
      id: column.id,
      header: column.header,
      sortable: column.sort !== undefined,
    })),
    containerWidth !== undefined,
  );
  const boundsOf = (column: AdminDataTableColumn<Row>) =>
    columnBounds({ ...column, headerWidth: headerFloors[column.id] });
  const fitColumns = columns.map((column) => ({
    id: column.id,
    headerWidth: headerFloors[column.id],
    priority: column.priority,
    defaultWidth: column.defaultWidth,
    minWidth:
      column.minWidth ??
      (column.resizable === false && column.defaultWidth !== undefined
        ? column.defaultWidth
        : undefined),
    maxWidth: column.maxWidth,
    fillWidth: column.fillWidth,
    override: column.defaultWidth === undefined ? undefined : overrides[column.id],
  }));
  let fit = resolveTableFit(containerWidth, fitColumns, renderDetails ? DETAILS_COLUMN_WIDTH : 0);
  if (!renderDetails && !fit.stacked && fit.visibleIds.length < columns.length) {
    fit = resolveTableFit(containerWidth, fitColumns, DETAILS_COLUMN_WIDTH);
  }
  const visibleColumns = columns.filter((column) => fit.visibleIds.includes(column.id));
  const hiddenColumns = fit.stacked
    ? []
    : columns.filter((column) => !fit.visibleIds.includes(column.id));
  const hasDetailsColumn = Boolean(renderDetails) || hiddenColumns.length > 0;
  const widthOf = (column: AdminDataTableColumn<Row>): number | undefined => fit.widths[column.id];

  const persist = (widths: Widths) => {
    const known = new Set(columns.map((column) => column.id));
    writeStoredWidths(
      storageKey,
      Object.fromEntries(Object.entries(widths).filter(([id]) => known.has(id))),
    );
  };

  const setWidth = (
    column: AdminDataTableColumn<Row>,
    width: number | undefined,
    { save }: { save: boolean },
  ) => {
    const next = { ...latest.current };
    if (width === undefined) delete next[column.id];
    else {
      const { min, max } = boundsOf(column);
      next[column.id] = clamp(width, min, max);
    }
    latest.current = next;
    setStored({ key: storageKey, widths: next });
    if (save) persist(next);
  };

  const onHandleKeyDown = (column: AdminDataTableColumn<Row>, event: KeyboardEvent) => {
    const current = widthOf(column);
    if (current === undefined) return;
    const step = event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
    const { min, max } = boundsOf(column);
    let next: number | undefined | null = null;
    if (event.key === "Escape" && menuFor === column.id) {
      setMenuFor(undefined);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + step;
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - step;
    else if (event.key === "PageUp") next = current + KEYBOARD_LARGE_STEP;
    else if (event.key === "PageDown") next = current - KEYBOARD_LARGE_STEP;
    else if (event.key === "Home") next = undefined;
    else if (event.key === "End") next = max;
    if (next === null) return;
    event.preventDefault();
    setWidth(column, next === undefined ? undefined : clamp(next, min, max), { save: true });
  };

  const onPointerDown = (column: AdminDataTableColumn<Row>, event: PointerEvent<HTMLElement>) => {
    const startWidth = widthOf(column);
    if (startWidth === undefined || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { id: column.id, startX: event.clientX, startWidth };
    dragged.current = false;
  };
  const onPointerMove = (column: AdminDataTableColumn<Row>, event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (!active || active.id !== column.id) return;
    const travelled = event.clientX - active.startX;
    if (!dragged.current && Math.abs(travelled) < DRAG_THRESHOLD) return;
    dragged.current = true;
    setMenuFor(undefined);
    setWidth(column, active.startWidth + travelled, { save: false });
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = undefined;
    if (dragged.current) persist(latest.current);
  };

  const closeMenu = (column: AdminDataTableColumn<Row>) => {
    setMenuFor(undefined);
    handles.current.get(column.id)?.focus();
  };
  const stepWidth = (column: AdminDataTableColumn<Row>, delta: number) => {
    const current = widthOf(column);
    if (current !== undefined) setWidth(column, current + delta, { save: true });
  };
  const onMenuKeyDown = (column: AdminDataTableColumn<Row>, event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    closeMenu(column);
  };

  const toggle = (key: string) => {
    const next = expanded.includes(key)
      ? expanded.filter((open) => open !== key)
      : [...expanded, key];
    if (expandedKeys === undefined) setExpandedState(next);
    onExpandedChange?.(next);
  };

  const columnCount = visibleColumns.length + (hasDetailsColumn ? 1 : 0);
  const hasFillColumn = visibleColumns.some((column) => column.defaultWidth === undefined);
  const tableSize = {
    "--admin-kit-data-table-min-width": `${fit.minTableWidth}px`,
    ...(hasFillColumn ? {} : { "--admin-kit-data-table-width": `${fit.minTableWidth}px` }),
  } as CSSProperties;

  return (
    <div
      className={["admin-kit__table-wrap admin-kit__data-table-wrap", wrapClassName]
        .filter(Boolean)
        .join(" ")}
      data-narrow={
        (fit.stacked && containerWidth !== undefined && containerWidth < NARROW_CARD_WIDTH) ||
        undefined
      }
      data-fill={(fill && fillBox !== undefined) || undefined}
      data-scrolls={fit.scrolls || undefined}
      data-stacked={fit.stacked || undefined}
      ref={wrapRef}
      style={
        {
          scrollPaddingBlockStart: fit.stacked || !headHeight ? undefined : `${headHeight}px`,
          ...(fill && fillBox
            ? { "--admin-kit-fill-top": `${fillBox.top}px`, "--admin-kit-fill-below": `${fillBox.below}px` }
            : {}),
        } as CSSProperties
      }
    >
      <table
        aria-busy={busy}
        aria-label={label}
        className={["admin-kit__table admin-kit__data-table", className].filter(Boolean).join(" ")}
        data-stacked={fit.stacked || undefined}
        style={tableSize}
      >
        <colgroup>
          {visibleColumns.map((column) => {
            const width = widthOf(column);
            return (
              <col
                className={column.className}
                data-column={column.id}
                key={column.id}
                style={width === undefined ? undefined : { width: `${width}px` }}
              />
            );
          })}
          {hasDetailsColumn ? <col style={{ width: `${DETAILS_COLUMN_WIDTH}px` }} /> : null}
        </colgroup>
        <thead>
          <tr>
            {visibleColumns.map((column) => {
              const width = widthOf(column);
              const resizable = width !== undefined && column.resizable !== false && !fit.stacked;
              const { min, max } = boundsOf(column);
              const menuOpen = resizable && menuFor === column.id;
              const menuId = `${idPrefix}-resize-${column.id}`;
              return (
                <th
                  aria-label={column.header}
                  aria-sort={column.sort?.direction}
                  className={[
                    "admin-kit__data-table-heading",
                    menuOpen ? "admin-kit__data-table-heading--menu-open" : undefined,
                    column.headerClassName,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={column.id}
                  scope="col"
                >
                  <span className="admin-kit__data-table-heading-text">
                    {column.sort ? (
                      <button
                        className="admin-kit__sort-button"
                        onClick={column.sort.onSort}
                        type="button"
                      >
                        {column.headerContent ?? column.header}
                        <span aria-hidden="true">{SORT_ARROWS[column.sort.direction]}</span>
                      </button>
                    ) : (
                      (column.headerContent ?? column.header)
                    )}
                  </span>
                  {resizable ? (
                    <>
                      <span
                        aria-label={`Resize ${column.header} column`}
                        aria-orientation="vertical"
                        aria-valuemax={max}
                        aria-valuemin={min}
                        aria-valuenow={width}
                        aria-valuetext={`${width} pixels`}
                        className="admin-kit__column-resizer"
                        data-resize-column={column.id}
                        onClick={() => {
                          if (!dragged.current) setMenuFor(menuOpen ? undefined : column.id);
                        }}
                        onDoubleClick={() => {
                          setMenuFor(undefined);
                          setWidth(column, undefined, { save: true });
                        }}
                        onKeyDown={(event) => onHandleKeyDown(column, event)}
                        onLostPointerCapture={endDrag}
                        onPointerCancel={endDrag}
                        onPointerDown={(event) => onPointerDown(column, event)}
                        onPointerMove={(event) => onPointerMove(column, event)}
                        onPointerUp={endDrag}
                        ref={(node) => {
                          if (node) handles.current.set(column.id, node);
                          else handles.current.delete(column.id);
                        }}
                        role="separator"
                        tabIndex={0}
                        title="Click for a width menu, or drag or use the arrow keys to resize. Home or double-click resets."
                      />
                      {menuOpen ? (
                        <div
                          aria-label={`${column.header} column width`}
                          className="admin-kit__column-menu"
                          data-resize-column={column.id}
                          id={menuId}
                          onKeyDown={(event) => onMenuKeyDown(column, event)}
                          role="group"
                        >
                          <button
                            aria-label={`Narrow ${column.header} column`}
                            onClick={() => stepWidth(column, -MENU_STEP)}
                            type="button"
                          >
                            Narrower
                          </button>
                          <button
                            aria-label={`Widen ${column.header} column`}
                            onClick={() => stepWidth(column, MENU_STEP)}
                            type="button"
                          >
                            Wider
                          </button>
                          <button
                            aria-label={`Reset ${column.header} column width`}
                            onClick={() => {
                              setWidth(column, undefined, { save: true });
                              closeMenu(column);
                            }}
                            type="button"
                          >
                            Reset width
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </th>
              );
            })}
            {hasDetailsColumn ? (
              <th className="admin-kit__data-table-heading" scope="col">
                <span className="admin-kit__data-table-heading-text">{detailsLabel}</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isOpen = expanded.includes(key);
            const detailsId = `${idPrefix}-details-${key}`;
            const expansion = renderExpansion?.(row);
            const isExpanded = isOpen || (expansion !== null && expansion !== undefined);
            return (
              <Fragment key={key}>
                <tr
                  aria-busy={rowBusy?.(row) || undefined}
                  className={isExpanded ? "admin-kit__data-table-row--expanded" : undefined}
                >
                  {visibleColumns.map((column) => {
                    const content = column.cell(row);
                    return (
                      <td
                        className={
                          [
                            column.truncate ? "admin-kit__table-cell--truncate" : undefined,
                            column.className,
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        data-card-slot={column.cardSlot}
                        data-empty={isEmptyNode(content) || undefined}
                        key={column.id}
                        title={column.title?.(row)}
                      >
                        <AdminMobileCellLabel>
                          {column.headerContent ?? column.header}
                        </AdminMobileCellLabel>
                        <div className="admin-kit__cell-value">{content}</div>
                      </td>
                    );
                  })}
                  {hasDetailsColumn ? (
                    <td data-card-slot="actions">
                      <AdminMobileCellLabel>{detailsLabel}</AdminMobileCellLabel>
                      <button
                        aria-controls={isOpen ? detailsId : undefined}
                        aria-expanded={isOpen}
                        aria-label={
                          rowLabel
                            ? `${isOpen ? "Hide" : "View"} ${detailsLabel.toLowerCase()} for ${rowLabel(row)}`
                            : undefined
                        }
                        className="admin-kit__data-table-toggle"
                        data-row-key={key}
                        onClick={() => toggle(key)}
                        type="button"
                      >
                        {isOpen ? "Hide" : "View"}
                      </button>
                    </td>
                  ) : null}
                </tr>
                {hasDetailsColumn && isOpen ? (
                  <tr className="admin-kit__data-table-details-row" id={detailsId}>
                    <td colSpan={columnCount}>
                      {renderDetails?.(row)}
                      {hiddenColumns.length > 0 ? (
                        <dl className="admin-kit__data-table-hidden-values">
                          {hiddenColumns.map((column) => (
                            <div key={column.id}>
                              <dt>{column.headerContent ?? column.header}</dt>
                              <dd>{column.cell(row)}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
                {expansion !== null && expansion !== undefined ? (
                  <tr className="admin-kit__data-table-details-row">
                    <td colSpan={columnCount}>{expansion}</td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
