"use client";
import { useCallback, useSyncExternalStore } from "react";

export type AdminBandWidthClass = "regular" | "compact";
export type AdminBandDefault = "auto" | boolean;
type StoredBandState = "collapsed" | "expanded";

export const ADMIN_BAND_COMPACT_QUERY = "(max-width: 63.99rem), (max-height: 44.99rem)";
const STORAGE_PREFIX = "admin-kit:header:";

const unsavedChoices = new Map<string, StoredBandState>();
const listeners = new Set<() => void>();

export function bandWidthClass(): AdminBandWidthClass {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "regular";
  return window.matchMedia(ADMIN_BAND_COMPACT_QUERY).matches ? "compact" : "regular";
}

export function bandStorageKey(storageKey: string, widthClass: AdminBandWidthClass): string {
  return `${STORAGE_PREFIX}${storageKey}:${widthClass}`;
}

export function resolveBandCollapsed(
  stored: StoredBandState | undefined,
  defaultCollapsed: AdminBandDefault,
  widthClass: AdminBandWidthClass,
): boolean {
  if (stored) return stored === "collapsed";
  return defaultCollapsed === "auto" ? widthClass === "compact" : defaultCollapsed;
}

function readStoredChoice(key: string): StoredBandState | undefined {
  const unsaved = unsavedChoices.get(key);
  if (unsaved) return unsaved;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === "collapsed" || raw === "expanded" ? raw : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredChoice(key: string, choice: StoredBandState) {
  try {
    window.localStorage.setItem(key, choice);
    unsavedChoices.delete(key);
  } catch {
    unsavedChoices.set(key, choice);
  }
}

function readBandCollapsed(storageKey: string | undefined, defaultCollapsed: AdminBandDefault) {
  if (!storageKey || typeof window === "undefined") return false;
  const widthClass = bandWidthClass();
  return resolveBandCollapsed(
    readStoredChoice(bandStorageKey(storageKey, widthClass)),
    defaultCollapsed,
    widthClass,
  );
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const media =
    typeof window.matchMedia === "function" ? window.matchMedia(ADMIN_BAND_COMPACT_QUERY) : null;
  window.addEventListener("storage", onChange);
  media?.addEventListener?.("change", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    media?.removeEventListener?.("change", onChange);
  };
}

// Renders expanded on the server; the client snapshot is read before first paint.
export function useBandCollapsed(
  storageKey: string | undefined,
  defaultCollapsed: AdminBandDefault = "auto",
) {
  const collapsed = useSyncExternalStore(
    subscribe,
    () => readBandCollapsed(storageKey, defaultCollapsed),
    () => false,
  );
  const setCollapsed = useCallback(
    (next: boolean) => {
      if (!storageKey) return;
      writeStoredChoice(
        bandStorageKey(storageKey, bandWidthClass()),
        next ? "collapsed" : "expanded",
      );
      listeners.forEach((notify) => notify());
    },
    [storageKey],
  );
  return [collapsed, setCollapsed] as const;
}
