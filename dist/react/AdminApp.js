"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApp = AdminApp;
const jsx_runtime_1 = require("react/jsx-runtime");
const core_1 = require("../core");
const AdminPortal_1 = require("./AdminPortal");
/**
 * The canonical Admin Kit application shell. Use this for every host
 * administration area; the lower-level AdminPortal remains available only for
 * product-specific navigation that has no capability registry.
 */
function AdminApp(props) {
    (0, core_1.defineAdminApp)({ groups: props.groups });
    return (0, jsx_runtime_1.jsx)(AdminPortal_1.AdminPortal, { ...props, groups: props.groups });
}
