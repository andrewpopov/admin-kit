"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDataTable = AdminDataTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminTablePrimitives_1 = require("./AdminTablePrimitives");
const DEFAULT_MIN_WIDTH = 64;
const DEFAULT_MAX_WIDTH = 960;
const KEYBOARD_STEP = 16;
const KEYBOARD_LARGE_STEP = 64;
const STORAGE_PREFIX = "admin-kit:table-widths:";
const DETAILS_COLUMN_WIDTH = 96;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Math.round(value)));
}
function bounds(column) {
    return {
        min: column.minWidth ?? DEFAULT_MIN_WIDTH,
        max: column.maxWidth ?? DEFAULT_MAX_WIDTH,
    };
}
function readStoredWidths(storageKey) {
    if (!storageKey || typeof window === "undefined")
        return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            return {};
        return Object.fromEntries(Object.entries(parsed).filter((entry) => typeof entry[1] === "number" && Number.isFinite(entry[1])));
    }
    catch {
        return {};
    }
}
function writeStoredWidths(storageKey, widths) {
    if (!storageKey || typeof window === "undefined")
        return;
    try {
        if (Object.keys(widths).length === 0)
            window.localStorage.removeItem(STORAGE_PREFIX + storageKey);
        else
            window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(widths));
    }
    catch {
        // Storage is optional: the widths still apply for this visit.
    }
}
/** Resizable, sticky-header data table; below 48rem rows become labelled cards. */
function AdminDataTable({ columns, rows, rowKey, label, storageKey, busy = false, renderDetails, detailsLabel = "Details", rowLabel, className, wrapClassName, }) {
    const idPrefix = (0, react_1.useId)();
    const [stored, setStored] = (0, react_1.useState)(() => ({
        key: storageKey,
        widths: readStoredWidths(storageKey),
    }));
    if (stored.key !== storageKey) {
        setStored({ key: storageKey, widths: readStoredWidths(storageKey) });
    }
    const overrides = stored.key === storageKey ? stored.widths : {};
    const latest = (0, react_1.useRef)(overrides);
    latest.current = overrides;
    const [expanded, setExpanded] = (0, react_1.useState)(() => new Set());
    const drag = (0, react_1.useRef)();
    const widthOf = (column) => {
        if (column.defaultWidth === undefined)
            return undefined;
        const { min, max } = bounds(column);
        return clamp(overrides[column.id] ?? column.defaultWidth, min, max);
    };
    const persist = (widths) => {
        const known = new Set(columns.map((column) => column.id));
        writeStoredWidths(storageKey, Object.fromEntries(Object.entries(widths).filter(([id]) => known.has(id))));
    };
    const setWidth = (column, width, { save }) => {
        const next = { ...latest.current };
        if (width === undefined)
            delete next[column.id];
        else {
            const { min, max } = bounds(column);
            next[column.id] = clamp(width, min, max);
        }
        latest.current = next;
        setStored({ key: storageKey, widths: next });
        if (save)
            persist(next);
    };
    const onHandleKeyDown = (column, event) => {
        const current = widthOf(column);
        if (current === undefined)
            return;
        const step = event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
        const { min, max } = bounds(column);
        let next = null;
        if (event.key === "ArrowRight" || event.key === "ArrowUp")
            next = current + step;
        else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
            next = current - step;
        else if (event.key === "PageUp")
            next = current + KEYBOARD_LARGE_STEP;
        else if (event.key === "PageDown")
            next = current - KEYBOARD_LARGE_STEP;
        else if (event.key === "Home")
            next = undefined;
        else if (event.key === "End")
            next = max;
        if (next === null)
            return;
        event.preventDefault();
        setWidth(column, next === undefined ? undefined : clamp(next, min, max), { save: true });
    };
    const onPointerDown = (column, event) => {
        const startWidth = widthOf(column);
        if (startWidth === undefined || event.button !== 0)
            return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { id: column.id, startX: event.clientX, startWidth };
    };
    const onPointerMove = (column, event) => {
        const active = drag.current;
        if (!active || active.id !== column.id)
            return;
        setWidth(column, active.startWidth + (event.clientX - active.startX), { save: false });
    };
    const endDrag = () => {
        if (!drag.current)
            return;
        drag.current = undefined;
        persist(latest.current);
    };
    const toggle = (key) => setExpanded((current) => {
        const next = new Set(current);
        if (next.has(key))
            next.delete(key);
        else
            next.add(key);
        return next;
    });
    const fixedWidth = columns.reduce((total, column) => total + (widthOf(column) ?? column.minWidth ?? DEFAULT_MIN_WIDTH * 3), 0) + (renderDetails ? DETAILS_COLUMN_WIDTH : 0);
    const columnCount = columns.length + (renderDetails ? 1 : 0);
    const hasFillColumn = columns.some((column) => column.defaultWidth === undefined);
    const tableSize = {
        "--admin-kit-data-table-min-width": `${fixedWidth}px`,
        ...(hasFillColumn ? {} : { "--admin-kit-data-table-width": `${fixedWidth}px` }),
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: [
            "admin-kit__table-wrap admin-kit__table-wrap--stack admin-kit__data-table-wrap",
            wrapClassName,
        ]
            .filter(Boolean)
            .join(" "), children: (0, jsx_runtime_1.jsxs)("table", { "aria-busy": busy, "aria-label": label, className: ["admin-kit__table admin-kit__table--stack admin-kit__data-table", className]
                .filter(Boolean)
                .join(" "), style: tableSize, children: [(0, jsx_runtime_1.jsxs)("colgroup", { children: [columns.map((column) => {
                            const width = widthOf(column);
                            return ((0, jsx_runtime_1.jsx)("col", { "data-column": column.id, style: width === undefined ? undefined : { width: `${width}px` } }, column.id));
                        }), renderDetails ? (0, jsx_runtime_1.jsx)("col", { style: { width: `${DETAILS_COLUMN_WIDTH}px` } }) : null] }), (0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [columns.map((column) => {
                                const width = widthOf(column);
                                const resizable = width !== undefined && column.resizable !== false;
                                const { min, max } = bounds(column);
                                return ((0, jsx_runtime_1.jsxs)("th", { "aria-label": column.header, className: "admin-kit__data-table-heading", scope: "col", children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__data-table-heading-text", children: column.header }), resizable ? ((0, jsx_runtime_1.jsx)("span", { "aria-label": `Resize ${column.header} column`, "aria-orientation": "vertical", "aria-valuemax": max, "aria-valuemin": min, "aria-valuenow": width, "aria-valuetext": `${width} pixels`, className: "admin-kit__column-resizer", onDoubleClick: () => setWidth(column, undefined, { save: true }), onKeyDown: (event) => onHandleKeyDown(column, event), onLostPointerCapture: endDrag, onPointerCancel: endDrag, onPointerDown: (event) => onPointerDown(column, event), onPointerMove: (event) => onPointerMove(column, event), onPointerUp: endDrag, role: "separator", tabIndex: 0, title: "Drag, or use the arrow keys, to resize. Home or double-click resets." })) : null] }, column.id));
                            }), renderDetails ? ((0, jsx_runtime_1.jsx)("th", { className: "admin-kit__data-table-heading", scope: "col", children: detailsLabel })) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: rows.map((row) => {
                        const key = rowKey(row);
                        const isOpen = expanded.has(key);
                        const detailsId = `${idPrefix}-details-${key}`;
                        return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("tr", { className: isOpen ? "admin-kit__data-table-row--expanded" : undefined, children: [columns.map((column) => ((0, jsx_runtime_1.jsxs)("td", { className: [
                                                column.truncate ? "admin-kit__table-cell--truncate" : undefined,
                                                column.className,
                                            ]
                                                .filter(Boolean)
                                                .join(" ") || undefined, title: column.title?.(row), children: [(0, jsx_runtime_1.jsx)(AdminTablePrimitives_1.AdminMobileCellLabel, { children: column.header }), column.cell(row)] }, column.id))), renderDetails ? ((0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)(AdminTablePrimitives_1.AdminMobileCellLabel, { children: detailsLabel }), (0, jsx_runtime_1.jsx)("button", { "aria-controls": isOpen ? detailsId : undefined, "aria-expanded": isOpen, "aria-label": rowLabel
                                                        ? `${isOpen ? "Hide" : "View"} ${detailsLabel.toLowerCase()} for ${rowLabel(row)}`
                                                        : undefined, className: "admin-kit__data-table-toggle", onClick: () => toggle(key), type: "button", children: isOpen ? "Hide" : "View" })] })) : null] }), renderDetails && isOpen ? ((0, jsx_runtime_1.jsx)("tr", { className: "admin-kit__data-table-details-row", id: detailsId, children: (0, jsx_runtime_1.jsx)("td", { colSpan: columnCount, children: renderDetails(row) }) })) : null] }, key));
                    }) })] }) }));
}
