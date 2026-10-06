"use client";
import { createContext, useContext, useId, type ReactNode } from "react";
import { useAdminLabels } from "./AdminLabels";

const AdminContentTargetContext = createContext<string | undefined>(undefined);

/** Shares one stable id between a skip link and the content region it targets. */
export function AdminContentTargetProvider({ children }: { children: ReactNode }) {
  const id = `admin-kit-content-${useId().replace(/:/g, "")}`;
  return (
    <AdminContentTargetContext.Provider value={id}>{children}</AdminContentTargetContext.Provider>
  );
}

export function useAdminContentTargetId(): string | undefined {
  return useContext(AdminContentTargetContext);
}

/**
 * First focusable element of an app: hidden until keyboard focus, then moves
 * focus into the content region. It focuses programmatically instead of
 * following the hash so hash-based host routers never see a URL change.
 */
export function AdminSkipLink() {
  const labels = useAdminLabels();
  const targetId = useAdminContentTargetId();
  if (!targetId) return null;

  return (
    <a
      className="admin-kit__skip-link"
      href={`#${targetId}`}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();
        target.focus();
      }}
    >
      {labels.skipToContent}
    </a>
  );
}
