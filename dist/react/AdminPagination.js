"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPagination = AdminPagination;
const jsx_runtime_1 = require("react/jsx-runtime");
const AdminLabels_1 = require("./AdminLabels");
/** Previous/next paging with a polite "Page X of Y" status; renders nothing when there is one page or fewer. */
function AdminPagination({ page, pageCount, onPageChange, label }) {
    const labels = (0, AdminLabels_1.useAdminLabels)();
    if (pageCount <= 1)
        return null;
    return ((0, jsx_runtime_1.jsxs)("nav", { className: "admin-kit__pagination", "aria-label": label, children: [(0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__pagination-previous", type: "button", disabled: page <= 1, onClick: () => onPageChange(page - 1), children: labels.previousPage }), (0, jsx_runtime_1.jsx)("span", { "aria-live": "polite", children: labels.pageStatus(page, pageCount) }), (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__pagination-next", type: "button", disabled: page >= pageCount, onClick: () => onPageChange(page + 1), children: labels.nextPage })] }));
}
