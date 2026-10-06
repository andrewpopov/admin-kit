import type { ReactNode } from "react";

export function AdminMobileCellLabel({ children }: { children: ReactNode }) {
  // The semantic thead already names the column for assistive tech; this visible phone label would read it twice.
  return (
    <span aria-hidden="true" className="admin-kit__mobile-cell-label">
      {children}
    </span>
  );
}
