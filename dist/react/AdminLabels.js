"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAdminLabels = void 0;
exports.AdminLabelsProvider = AdminLabelsProvider;
exports.useAdminLabels = useAdminLabels;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
exports.defaultAdminLabels = {
    loading: "Loading…",
    errorTitle: "Unable to load this section",
    retry: "Try again",
    cancel: "Cancel",
    previousPage: "Previous",
    nextPage: "Next",
    pageStatus: (page, pageCount) => `Page ${page} of ${pageCount}`,
};
const AdminLabelsContext = (0, react_1.createContext)(exports.defaultAdminLabels);
/**
 * Localizes shared Admin Kit chrome strings (loading/error/pagination copy) for
 * every descendant. Layers over the labels already in context — so nested
 * providers (e.g. a host wrapping `AdminApp`, which installs its own provider)
 * compose instead of resetting unspecified strings to English — and ignores
 * `undefined` overrides so an explicit `{ cancel: undefined }` keeps the
 * inherited value rather than blanking it.
 */
function AdminLabelsProvider({ labels, children, }) {
    const inherited = useAdminLabels();
    const value = (0, react_1.useMemo)(() => {
        if (!labels)
            return inherited;
        const defined = Object.fromEntries(Object.entries(labels).filter(([, override]) => override !== undefined));
        return { ...inherited, ...defined };
    }, [inherited, labels]);
    return (0, jsx_runtime_1.jsx)(AdminLabelsContext.Provider, { value: value, children: children });
}
function useAdminLabels() {
    return (0, react_1.useContext)(AdminLabelsContext);
}
