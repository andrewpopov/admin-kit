import { type ReactNode } from "react";
import { type AdminSessionSummary, type AdminSessionsAdapter } from "../core";
export interface SessionsPanelProps<Session extends AdminSessionSummary = AdminSessionSummary> {
    adapter: AdminSessionsAdapter<Session>;
    title?: string;
    renderSessionActions?: (session: Session, context: {
        reload: () => Promise<void>;
        isPending: boolean;
    }) => ReactNode;
    getRevokeDescription?: (session: Session) => string;
    formatTimestamp?: (iso: string) => string;
    dialogClassName?: string;
    className?: string;
}
/** Active-session administration with host-owned token and authorization semantics. */
export declare function SessionsPanel<Session extends AdminSessionSummary = AdminSessionSummary>({ adapter, title, renderSessionActions, getRevokeDescription, formatTimestamp, dialogClassName, className, }: SessionsPanelProps<Session>): import("react").JSX.Element;
