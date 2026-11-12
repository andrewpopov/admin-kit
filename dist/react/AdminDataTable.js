"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDataTable = AdminDataTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminTablePrimitives_1 = require("./AdminTablePrimitives");
const adminDataTableFit_1 = require("./adminDataTableFit");
const KEYBOARD_STEP = 16;
const KEYBOARD_LARGE_STEP = 64;
const MENU_STEP = 32;
const DRAG_THRESHOLD = 4;
const STORAGE_PREFIX = "admin-kit:table-widths:";
const useIsomorphicLayoutEffect = typeof window === "undefined" ? react_1.useEffect : react_1.useLayoutEffect;
const SORT_ARROWS = { ascending: "↑", descending: "↓", none: "↕" };
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
/** Resizable, sticky-header data table that fits its container: columns shrink, low-priority ones hide, and rows become cards when the primary columns cannot fit. */
function AdminDataTable({ columns, rows, rowKey, label, storageKey, busy = false, renderDetails, detailsLabel = "Details", expandedKeys, onExpandedChange, rowBusy, renderExpansion, rowLabel, className, wrapClassName, }) {
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
    const [expandedState, setExpandedState] = (0, react_1.useState)([]);
    const expanded = expandedKeys ?? expandedState;
    const wrapRef = (0, react_1.useRef)(null);
    const [containerWidth, setContainerWidth] = (0, react_1.useState)();
    const drag = (0, react_1.useRef)();
    const dragged = (0, react_1.useRef)(false);
    const handles = (0, react_1.useRef)(new Map());
    const [menuFor, setMenuFor] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => {
        if (menuFor === undefined)
            return;
        document.getElementById(`${idPrefix}-resize-${menuFor}`)?.querySelector("button")?.focus();
        const closeOutside = (event) => {
            const owner = event.target instanceof Element && event.target.closest("[data-resize-column]");
            if (!owner || owner.getAttribute("data-resize-column") !== menuFor)
                setMenuFor(undefined);
        };
        document.addEventListener("pointerdown", closeOutside);
        return () => document.removeEventListener("pointerdown", closeOutside);
    }, [idPrefix, menuFor]);
    useIsomorphicLayoutEffect(() => {
        const wrap = wrapRef.current;
        if (!wrap)
            return undefined;
        const measure = () => setContainerWidth(wrap.clientWidth || undefined);
        measure();
        if (typeof ResizeObserver === "undefined")
            return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(wrap);
        return () => observer.disconnect();
    }, []);
    const fit = (0, adminDataTableFit_1.resolveTableFit)(containerWidth, columns.map((column) => ({
        id: column.id,
        priority: column.priority,
        defaultWidth: column.defaultWidth,
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
        override: column.defaultWidth === undefined ? undefined : overrides[column.id],
    })), renderDetails ? adminDataTableFit_1.DETAILS_COLUMN_WIDTH : 0);
    const visibleColumns = columns.filter((column) => fit.visibleIds.includes(column.id));
    const widthOf = (column) => fit.widths[column.id];
    const persist = (widths) => {
        const known = new Set(columns.map((column) => column.id));
        writeStoredWidths(storageKey, Object.fromEntries(Object.entries(widths).filter(([id]) => known.has(id))));
    };
    const setWidth = (column, width, { save }) => {
        const next = { ...latest.current };
        if (width === undefined)
            delete next[column.id];
        else {
            const { min, max } = (0, adminDataTableFit_1.columnBounds)(column);
            next[column.id] = (0, adminDataTableFit_1.clamp)(width, min, max);
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
        const { min, max } = (0, adminDataTableFit_1.columnBounds)(column);
        let next = null;
        if (event.key === "Escape" && menuFor === column.id) {
            setMenuFor(undefined);
            return;
        }
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
        setWidth(column, next === undefined ? undefined : (0, adminDataTableFit_1.clamp)(next, min, max), { save: true });
    };
    const onPointerDown = (column, event) => {
        const startWidth = widthOf(column);
        if (startWidth === undefined || event.button !== 0)
            return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { id: column.id, startX: event.clientX, startWidth };
        dragged.current = false;
    };
    const onPointerMove = (column, event) => {
        const active = drag.current;
        if (!active || active.id !== column.id)
            return;
        const travelled = event.clientX - active.startX;
        if (!dragged.current && Math.abs(travelled) < DRAG_THRESHOLD)
            return;
        dragged.current = true;
        setMenuFor(undefined);
        setWidth(column, active.startWidth + travelled, { save: false });
    };
    const endDrag = () => {
        if (!drag.current)
            return;
        drag.current = undefined;
        if (dragged.current)
            persist(latest.current);
    };
    const closeMenu = (column) => {
        setMenuFor(undefined);
        handles.current.get(column.id)?.focus();
    };
    const stepWidth = (column, delta) => {
        const current = widthOf(column);
        if (current !== undefined)
            setWidth(column, current + delta, { save: true });
    };
    const onMenuKeyDown = (column, event) => {
        if (event.key !== "Escape")
            return;
        event.stopPropagation();
        closeMenu(column);
    };
    const toggle = (key) => {
        const next = expanded.includes(key)
            ? expanded.filter((open) => open !== key)
            : [...expanded, key];
        if (expandedKeys === undefined)
            setExpandedState(next);
        onExpandedChange?.(next);
    };
    const columnCount = visibleColumns.length + (renderDetails ? 1 : 0);
    const hasFillColumn = visibleColumns.some((column) => column.defaultWidth === undefined);
    const tableSize = {
        "--admin-kit-data-table-min-width": `${fit.minTableWidth}px`,
        ...(hasFillColumn ? {} : { "--admin-kit-data-table-width": `${fit.minTableWidth}px` }),
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: ["admin-kit__table-wrap admin-kit__data-table-wrap", wrapClassName]
            .filter(Boolean)
            .join(" "), "data-scrolls": fit.scrolls || undefined, "data-stacked": fit.stacked || undefined, ref: wrapRef, children: (0, jsx_runtime_1.jsxs)("table", { "aria-busy": busy, "aria-label": label, className: ["admin-kit__table admin-kit__data-table", className].filter(Boolean).join(" "), "data-stacked": fit.stacked || undefined, style: tableSize, children: [(0, jsx_runtime_1.jsxs)("colgroup", { children: [visibleColumns.map((column) => {
                            const width = widthOf(column);
                            return ((0, jsx_runtime_1.jsx)("col", { className: column.className, "data-column": column.id, style: width === undefined ? undefined : { width: `${width}px` } }, column.id));
                        }), renderDetails ? (0, jsx_runtime_1.jsx)("col", { style: { width: `${adminDataTableFit_1.DETAILS_COLUMN_WIDTH}px` } }) : null] }), (0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [visibleColumns.map((column) => {
                                const width = widthOf(column);
                                const resizable = width !== undefined && column.resizable !== false && !fit.stacked;
                                const { min, max } = (0, adminDataTableFit_1.columnBounds)(column);
                                const menuOpen = resizable && menuFor === column.id;
                                const menuId = `${idPrefix}-resize-${column.id}`;
                                return ((0, jsx_runtime_1.jsxs)("th", { "aria-label": column.header, "aria-sort": column.sort?.direction, className: [
                                        "admin-kit__data-table-heading",
                                        menuOpen ? "admin-kit__data-table-heading--menu-open" : undefined,
                                        column.headerClassName,
                                    ]
                                        .filter(Boolean)
                                        .join(" "), scope: "col", children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__data-table-heading-text", children: column.sort ? ((0, jsx_runtime_1.jsxs)("button", { className: "admin-kit__sort-button", onClick: column.sort.onSort, type: "button", children: [column.headerContent ?? column.header, (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: SORT_ARROWS[column.sort.direction] })] })) : ((column.headerContent ?? column.header)) }), resizable ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { "aria-label": `Resize ${column.header} column`, "aria-orientation": "vertical", "aria-valuemax": max, "aria-valuemin": min, "aria-valuenow": width, "aria-valuetext": `${width} pixels`, className: "admin-kit__column-resizer", "data-resize-column": column.id, onClick: () => {
                                                        if (!dragged.current)
                                                            setMenuFor(menuOpen ? undefined : column.id);
                                                    }, onDoubleClick: () => {
                                                        setMenuFor(undefined);
                                                        setWidth(column, undefined, { save: true });
                                                    }, onKeyDown: (event) => onHandleKeyDown(column, event), onLostPointerCapture: endDrag, onPointerCancel: endDrag, onPointerDown: (event) => onPointerDown(column, event), onPointerMove: (event) => onPointerMove(column, event), onPointerUp: endDrag, ref: (node) => {
                                                        if (node)
                                                            handles.current.set(column.id, node);
                                                        else
                                                            handles.current.delete(column.id);
                                                    }, role: "separator", tabIndex: 0, title: "Click for a width menu, or drag or use the arrow keys to resize. Home or double-click resets." }), menuOpen ? ((0, jsx_runtime_1.jsxs)("div", { "aria-label": `${column.header} column width`, className: "admin-kit__column-menu", "data-resize-column": column.id, id: menuId, onKeyDown: (event) => onMenuKeyDown(column, event), role: "group", children: [(0, jsx_runtime_1.jsx)("button", { "aria-label": `Narrow ${column.header} column`, onClick: () => stepWidth(column, -MENU_STEP), type: "button", children: "Narrower" }), (0, jsx_runtime_1.jsx)("button", { "aria-label": `Widen ${column.header} column`, onClick: () => stepWidth(column, MENU_STEP), type: "button", children: "Wider" }), (0, jsx_runtime_1.jsx)("button", { "aria-label": `Reset ${column.header} column width`, onClick: () => {
                                                                setWidth(column, undefined, { save: true });
                                                                closeMenu(column);
                                                            }, type: "button", children: "Reset width" })] })) : null] })) : null] }, column.id));
                            }), renderDetails ? ((0, jsx_runtime_1.jsx)("th", { className: "admin-kit__data-table-heading", scope: "col", children: detailsLabel })) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: rows.map((row) => {
                        const key = rowKey(row);
                        const isOpen = expanded.includes(key);
                        const detailsId = `${idPrefix}-details-${key}`;
                        const expansion = renderExpansion?.(row);
                        const isExpanded = isOpen || (expansion !== null && expansion !== undefined);
                        return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("tr", { "aria-busy": rowBusy?.(row) || undefined, className: isExpanded ? "admin-kit__data-table-row--expanded" : undefined, children: [visibleColumns.map((column) => ((0, jsx_runtime_1.jsxs)("td", { className: [
                                                column.truncate ? "admin-kit__table-cell--truncate" : undefined,
                                                column.className,
                                            ]
                                                .filter(Boolean)
                                                .join(" ") || undefined, "data-card-slot": column.cardSlot, title: column.title?.(row), children: [(0, jsx_runtime_1.jsx)(AdminTablePrimitives_1.AdminMobileCellLabel, { children: column.headerContent ?? column.header }), (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__cell-value", children: column.cell(row) })] }, column.id))), renderDetails ? ((0, jsx_runtime_1.jsxs)("td", { "data-card-slot": "actions", children: [(0, jsx_runtime_1.jsx)(AdminTablePrimitives_1.AdminMobileCellLabel, { children: detailsLabel }), (0, jsx_runtime_1.jsx)("button", { "aria-controls": isOpen ? detailsId : undefined, "aria-expanded": isOpen, "aria-label": rowLabel
                                                        ? `${isOpen ? "Hide" : "View"} ${detailsLabel.toLowerCase()} for ${rowLabel(row)}`
                                                        : undefined, className: "admin-kit__data-table-toggle", "data-row-key": key, onClick: () => toggle(key), type: "button", children: isOpen ? "Hide" : "View" })] })) : null] }), renderDetails && isOpen ? ((0, jsx_runtime_1.jsx)("tr", { className: "admin-kit__data-table-details-row", id: detailsId, children: (0, jsx_runtime_1.jsx)("td", { colSpan: columnCount, children: renderDetails(row) }) })) : null, expansion !== null && expansion !== undefined ? ((0, jsx_runtime_1.jsx)("tr", { className: "admin-kit__data-table-details-row", children: (0, jsx_runtime_1.jsx)("td", { colSpan: columnCount, children: expansion }) })) : null] }, key));
                    }) })] }) }));
}
