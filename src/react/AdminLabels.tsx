"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface AdminLabels {
  loading: string;
  errorTitle: string;
  retry: string;
  cancel: string;
  previousPage: string;
  nextPage: string;
  pageStatus: (page: number, pageCount: number) => string;
}

export const defaultAdminLabels: AdminLabels = {
  loading: "Loading…",
  errorTitle: "Unable to load this section",
  retry: "Try again",
  cancel: "Cancel",
  previousPage: "Previous",
  nextPage: "Next",
  pageStatus: (page, pageCount) => `Page ${page} of ${pageCount}`,
};

const AdminLabelsContext = createContext<AdminLabels>(defaultAdminLabels);

/**
 * Localizes shared Admin Kit chrome strings (loading/error/pagination copy) for
 * every descendant. Layers over the labels already in context — so nested
 * providers (e.g. a host wrapping `AdminApp`, which installs its own provider)
 * compose instead of resetting unspecified strings to English — and ignores
 * `undefined` overrides so an explicit `{ cancel: undefined }` keeps the
 * inherited value rather than blanking it.
 */
export function AdminLabelsProvider({
  labels,
  children,
}: {
  labels?: Partial<AdminLabels>;
  children: ReactNode;
}) {
  const inherited = useAdminLabels();
  const value = useMemo<AdminLabels>(() => {
    if (!labels) return inherited;
    const defined = Object.fromEntries(
      Object.entries(labels).filter(([, override]) => override !== undefined),
    ) as Partial<AdminLabels>;
    return { ...inherited, ...defined };
  }, [inherited, labels]);

  return <AdminLabelsContext.Provider value={value}>{children}</AdminLabelsContext.Provider>;
}

export function useAdminLabels(): AdminLabels {
  return useContext(AdminLabelsContext);
}
