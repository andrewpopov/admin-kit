"use client";
import { useAdminLabels } from "./AdminLabels";

export interface AdminPaginationProps {
  /** The current page, starting at 1. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Accessible name of the navigation landmark, such as "User pagination". */
  label: string;
}

/** Previous/next paging with a polite "Page X of Y" status; renders nothing when there is one page or fewer. */
export function AdminPagination({ page, pageCount, onPageChange, label }: AdminPaginationProps) {
  const labels = useAdminLabels();
  if (pageCount <= 1) return null;
  return (
    <nav className="admin-kit__pagination" aria-label={label}>
      <button
        className="admin-kit__button admin-kit__pagination-previous"
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {labels.previousPage}
      </button>
      <span aria-live="polite">{labels.pageStatus(page, pageCount)}</span>
      <button
        className="admin-kit__button admin-kit__pagination-next"
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        {labels.nextPage}
      </button>
    </nav>
  );
}
