"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_BAND_COMPACT_QUERY = void 0;
exports.bandWidthClass = bandWidthClass;
exports.bandStorageKey = bandStorageKey;
exports.resolveBandCollapsed = resolveBandCollapsed;
exports.useBandCollapsed = useBandCollapsed;
const react_1 = require("react");
exports.ADMIN_BAND_COMPACT_QUERY = "(max-width: 63.99rem), (max-height: 44.99rem)";
const STORAGE_PREFIX = "admin-kit:header:";
const unsavedChoices = new Map();
const listeners = new Set();
function bandWidthClass() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
        return "regular";
    return window.matchMedia(exports.ADMIN_BAND_COMPACT_QUERY).matches ? "compact" : "regular";
}
function bandStorageKey(storageKey, widthClass) {
    return `${STORAGE_PREFIX}${storageKey}:${widthClass}`;
}
function resolveBandCollapsed(stored, defaultCollapsed, widthClass) {
    if (stored)
        return stored === "collapsed";
    return defaultCollapsed === "auto" ? widthClass === "compact" : defaultCollapsed;
}
function readStoredChoice(key) {
    const unsaved = unsavedChoices.get(key);
    if (unsaved)
        return unsaved;
    try {
        const raw = window.localStorage.getItem(key);
        return raw === "collapsed" || raw === "expanded" ? raw : undefined;
    }
    catch {
        return undefined;
    }
}
function writeStoredChoice(key, choice) {
    try {
        window.localStorage.setItem(key, choice);
        unsavedChoices.delete(key);
    }
    catch {
        unsavedChoices.set(key, choice);
    }
}
function readBandCollapsed(storageKey, defaultCollapsed) {
    if (!storageKey || typeof window === "undefined")
        return false;
    const widthClass = bandWidthClass();
    return resolveBandCollapsed(readStoredChoice(bandStorageKey(storageKey, widthClass)), defaultCollapsed, widthClass);
}
function subscribe(onChange) {
    listeners.add(onChange);
    const media = typeof window.matchMedia === "function" ? window.matchMedia(exports.ADMIN_BAND_COMPACT_QUERY) : null;
    window.addEventListener("storage", onChange);
    media?.addEventListener?.("change", onChange);
    return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onChange);
        media?.removeEventListener?.("change", onChange);
    };
}
// Renders expanded on the server; the client snapshot is read before first paint.
function useBandCollapsed(storageKey, defaultCollapsed = "auto") {
    const collapsed = (0, react_1.useSyncExternalStore)(subscribe, () => readBandCollapsed(storageKey, defaultCollapsed), () => false);
    const setCollapsed = (0, react_1.useCallback)((next) => {
        if (!storageKey)
            return;
        writeStoredChoice(bandStorageKey(storageKey, bandWidthClass()), next ? "collapsed" : "expanded");
        listeners.forEach((notify) => notify());
    }, [storageKey]);
    return [collapsed, setCollapsed];
}
