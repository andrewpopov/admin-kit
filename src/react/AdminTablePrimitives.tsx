import type { ReactNode } from "react";

export function AdminMobileCellLabel({ children }: { children: ReactNode }) {
  return <span className="admin-kit__mobile-cell-label">{children}</span>;
}
