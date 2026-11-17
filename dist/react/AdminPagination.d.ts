export interface AdminPaginationProps {
    /** The current page, starting at 1. */
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    /** Accessible name of the navigation landmark, such as "User pagination". */
    label: string;
}
/** Previous/next paging with a polite "Page X of Y" status; renders nothing when there is one page or fewer. */
export declare function AdminPagination({ page, pageCount, onPageChange, label }: AdminPaginationProps): import("react").JSX.Element | null;
