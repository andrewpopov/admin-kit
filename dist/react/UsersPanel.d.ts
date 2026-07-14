import { type ReactNode } from "react";
import { type AdminPageQuery, type AdminUserSummary, type AdminUsersAdapter } from "../core";
export interface UsersPanelProps<User extends AdminUserSummary> {
    adapter: AdminUsersAdapter<User>;
    pageSize?: number;
    query?: Omit<AdminPageQuery, "page" | "pageSize">;
    /** Opt in when the host adapter maps search text into its list query. */
    search?: false | {
        label?: string;
        placeholder?: string;
    };
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
/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
export declare function UsersPanel<User extends AdminUserSummary>({ adapter, pageSize, query, search: searchOptions, renderHeaderActions, renderUserActions, className, }: UsersPanelProps<User>): import("react").JSX.Element;
