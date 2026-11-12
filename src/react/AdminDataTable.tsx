"use client";
import {
  Fragment,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { AdminMobileCellLabel } from "./AdminTablePrimitives";

const DEFAULT_MIN_WIDTH = 64;
const DEFAULT_MAX_WIDTH = 960;
const KEYBOARD_STEP = 16;
const KEYBOARD_LARGE_STEP = 64;
const STORAGE_PREFIX = "admin-kit:table-widths:";
const DETAILS_COLUMN_WIDTH = 96;
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
  /** px. Omit on one column to make it fill the width the sized columns leave. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  /** One line with an ellipsis; pair with `title` and `renderDetails` so the full value stays reachable. */
  truncate?: boolean;
  title?: (row: Row) => string | undefined;
  className?: string;
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
  /** Marks a row's `<tr>` aria-busy, for rows with a pending action. */
  rowBusy?: (row: Row) => boolean;
  /** Content for a full-width row under the row, shown while it returns a value; the caller controls when. */
  renderExpansion?: (row: Row) => ReactNode;
  rowLabel?: (row: Row) => string;
  className?: string;
  wrapClassName?: string;
}

type Widths = Record<string, number>;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function bounds<Row>(column: AdminDataTableColumn<Row>) {
  return {
    min: column.minWidth ?? DEFAULT_MIN_WIDTH,
    max: column.maxWidth ?? DEFAULT_MAX_WIDTH,
  };
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

/** Resizable, sticky-header data table; below 48rem rows become labelled cards. */
export function AdminDataTable<Row>({
  columns,
  rows,
  rowKey,
  label,
  storageKey,
  busy = false,
  renderDetails,
  detailsLabel = "Details",
  rowBusy,
  renderExpansion,
  rowLabel,
  className,
  wrapClassName,
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
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const drag = useRef<{ id: string; startX: number; startWidth: number }>();

  const widthOf = (column: AdminDataTableColumn<Row>) => {
    if (column.defaultWidth === undefined) return undefined;
    const { min, max } = bounds(column);
    return clamp(overrides[column.id] ?? column.defaultWidth, min, max);
  };

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
      const { min, max } = bounds(column);
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
    const { min, max } = bounds(column);
    let next: number | undefined | null = null;
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
  };
  const onPointerMove = (column: AdminDataTableColumn<Row>, event: PointerEvent<HTMLElement>) => {
    const active = drag.current;
    if (!active || active.id !== column.id) return;
    setWidth(column, active.startWidth + (event.clientX - active.startX), { save: false });
  };
  const endDrag = () => {
    if (!drag.current) return;
    drag.current = undefined;
    persist(latest.current);
  };

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const fixedWidth =
    columns.reduce(
      (total, column) => total + (widthOf(column) ?? column.minWidth ?? DEFAULT_MIN_WIDTH * 3),
      0,
    ) + (renderDetails ? DETAILS_COLUMN_WIDTH : 0);
  const columnCount = columns.length + (renderDetails ? 1 : 0);
  const hasFillColumn = columns.some((column) => column.defaultWidth === undefined);
  const tableSize = {
    "--admin-kit-data-table-min-width": `${fixedWidth}px`,
    ...(hasFillColumn ? {} : { "--admin-kit-data-table-width": `${fixedWidth}px` }),
  } as CSSProperties;

  return (
    <div
      className={[
        "admin-kit__table-wrap admin-kit__table-wrap--stack admin-kit__data-table-wrap",
        wrapClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <table
        aria-busy={busy}
        aria-label={label}
        className={["admin-kit__table admin-kit__table--stack admin-kit__data-table", className]
          .filter(Boolean)
          .join(" ")}
        style={tableSize}
      >
        <colgroup>
          {columns.map((column) => {
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
          {renderDetails ? <col style={{ width: `${DETAILS_COLUMN_WIDTH}px` }} /> : null}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => {
              const width = widthOf(column);
              const resizable = width !== undefined && column.resizable !== false;
              const { min, max } = bounds(column);
              return (
                <th
                  aria-label={column.header}
                  aria-sort={column.sort?.direction}
                  className={["admin-kit__data-table-heading", column.headerClassName]
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
                    <span
                      aria-label={`Resize ${column.header} column`}
                      aria-orientation="vertical"
                      aria-valuemax={max}
                      aria-valuemin={min}
                      aria-valuenow={width}
                      aria-valuetext={`${width} pixels`}
                      className="admin-kit__column-resizer"
                      onDoubleClick={() => setWidth(column, undefined, { save: true })}
                      onKeyDown={(event) => onHandleKeyDown(column, event)}
                      onLostPointerCapture={endDrag}
                      onPointerCancel={endDrag}
                      onPointerDown={(event) => onPointerDown(column, event)}
                      onPointerMove={(event) => onPointerMove(column, event)}
                      onPointerUp={endDrag}
                      role="separator"
                      tabIndex={0}
                      title="Drag, or use the arrow keys, to resize. Home or double-click resets."
                    />
                  ) : null}
                </th>
              );
            })}
            {renderDetails ? (
              <th className="admin-kit__data-table-heading" scope="col">
                {detailsLabel}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isOpen = expanded.has(key);
            const detailsId = `${idPrefix}-details-${key}`;
            const expansion = renderExpansion?.(row);
            const isExpanded = isOpen || (expansion !== null && expansion !== undefined);
            return (
              <Fragment key={key}>
                <tr
                  aria-busy={rowBusy?.(row) || undefined}
                  className={isExpanded ? "admin-kit__data-table-row--expanded" : undefined}
                >
                  {columns.map((column) => (
                    <td
                      className={
                        [
                          column.truncate ? "admin-kit__table-cell--truncate" : undefined,
                          column.className,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      key={column.id}
                      title={column.title?.(row)}
                    >
                      <AdminMobileCellLabel>
                        {column.headerContent ?? column.header}
                      </AdminMobileCellLabel>
                      {column.cell(row)}
                    </td>
                  ))}
                  {renderDetails ? (
                    <td>
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
                        onClick={() => toggle(key)}
                        type="button"
                      >
                        {isOpen ? "Hide" : "View"}
                      </button>
                    </td>
                  ) : null}
                </tr>
                {renderDetails && isOpen ? (
                  <tr className="admin-kit__data-table-details-row" id={detailsId}>
                    <td colSpan={columnCount}>{renderDetails(row)}</td>
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
