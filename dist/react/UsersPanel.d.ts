import { type ReactNode } from "react";
import { type AdminPageQuery, type AdminSortDirection, type AdminUserSummary, type AdminUsersAdapter } from "../core";
import { type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
export interface UsersPanelProps<User extends AdminUserSummary> {
    adapter: AdminUsersAdapter<User>;
    title?: string;
    /** Promote the panel heading and controls into the route-level header band. */
    headerPresentation?: AdminPanelHeaderPresentation;
    pageSize?: number;
    query?: Omit<AdminPageQuery, "page" | "pageSize">;
    /** Opt in when the host adapter maps search text into its list query. */
    search?: false | {
        label?: string;
        placeholder?: string;
    };
    /** The standard responsive semantic-table presentation. */
    presentation?: "table";
    /** Opt-in scan-first schema for hosts with richer account metadata. */
    columns?: readonly AdminUserTableColumn<User>[];
    /** Initial server-backed sort for a sortable custom column. */
    defaultSort?: AdminUserTableSort;
    renderHeaderActions?: (context: {
        reload: () => Promise<void>;
        isLoading: boolean;
    }) => ReactNode;
    renderUserActions?: (user: User, context: {
        reload: () => Promise<void>;
        isPending: boolean;
    }) => ReactNode;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
}
export interface AdminUserTableColumn<User extends AdminUserSummary> {
    id: string;
    label: ReactNode;
    render: (user: User, context: AdminUserTableCellContext) => ReactNode;
    className?: string;
    headerClassName?: string;
    sortable?: boolean;
    /** Keeps concise values such as timestamps on a single line. */
    nowrap?: boolean;
    /** Responsive priority; lower-priority columns are hidden before the table scrolls. */
    priority?: "primary" | "secondary" | "tertiary";
}
export interface AdminUserTableSort {
    columnId: string;
    direction: AdminSortDirection;
}
export interface AdminUserTableCellContext {
    reload: () => Promise<void>;
    isPending: boolean;
    setRole: (role: string) => Promise<void>;
    setStatus: (status: string) => Promise<void>;
}
/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
export declare function UsersPanel<User extends AdminUserSummary>({ adapter, title, headerPresentation, pageSize, query, search: searchOptions, presentation, columns, defaultSort, renderHeaderActions, renderUserActions, className, }: UsersPanelProps<User>): import("react").JSX.Element;
