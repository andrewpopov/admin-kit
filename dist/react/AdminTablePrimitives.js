"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminMobileCellLabel = AdminMobileCellLabel;
const jsx_runtime_1 = require("react/jsx-runtime");
function AdminMobileCellLabel({ children }) {
    // The semantic thead already names the column for assistive tech; this visible phone label would read it twice.
    return ((0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", className: "admin-kit__mobile-cell-label", children: children }));
}
