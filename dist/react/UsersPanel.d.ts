import { type ReactNode } from "react";
import { type AdminPageQuery, type AdminUserSummary, type AdminUsersAdapter } from "../core";
export interface UsersPanelProps<User extends AdminUserSummary> {
    adapter: AdminUsersAdapter<User>;
    pageSize?: number;
    query?: Omit<AdminPageQuery, "page" | "pageSize">;
    renderUserActions?: (user: User) => ReactNode;
}
/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
export declare function UsersPanel<User extends AdminUserSummary>({ adapter, pageSize, query, renderUserActions, }: UsersPanelProps<User>): import("react").JSX.Element;
