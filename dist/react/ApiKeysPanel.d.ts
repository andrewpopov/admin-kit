import { type ReactNode } from "react";
import { type AdminApiKey, type AdminApiKeyQueueItem, type AdminApiKeysAdapter, type AdminApiKeysPosture, type AdminApiKeysSummary } from "../core";
export interface ApiKeysPanelProps<CreateInput, UpdateInput = never> {
    adapter: AdminApiKeysAdapter<CreateInput, UpdateInput>;
    /** Product vocabulary for credentials, such as "Personal access tokens". */
    title?: string;
    createInput?: CreateInput;
    renderCreate?: (controls: {
        /** Resolves true only when the panel accepted and revealed the new secret. */
        create: (input: CreateInput) => Promise<boolean>;
        pending: boolean;
    }) => ReactNode;
    renderEdit?: (controls: {
        key: AdminApiKey;
        update: (input: UpdateInput) => Promise<boolean>;
        pending: boolean;
    }) => ReactNode;
    /**
     * Replaces the default list without moving lifecycle state or confirmation
     * behavior into the host application. Use this when the product has
     * domain-specific credential policy to present alongside each key.
     */
    renderKeys?: (controls: {
        keys: readonly AdminApiKey[];
        requestRevoke: (key: AdminApiKey) => void;
        requestRotate?: (key: AdminApiKey) => void;
        update?: (key: AdminApiKey, input: UpdateInput) => Promise<boolean>;
        pendingKeyId?: string;
    }) => ReactNode;
    /**
     * Renders a host-vocabulary posture/health summary above the create/list
     * regions; the kit derives the facts, the host owns copy and links.
     */
    renderPosture?: (controls: {
        summary: AdminApiKeysSummary;
        posture: AdminApiKeysPosture;
        queue: readonly AdminApiKeyQueueItem[];
    }) => ReactNode;
    /**
     * Renders host navigation tiles/shortcuts (hosts own routes); badge counts
     * come from the summary.
     */
    renderShortcuts?: (controls: {
        summary: AdminApiKeysSummary;
        posture: AdminApiKeysPosture;
        queue: readonly AdminApiKeyQueueItem[];
    }) => ReactNode;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
    /** Optional host class for the portaled confirmation dialog. */
    dialogClassName?: string;
    /** Overrides the default timestamp presentation for lastUsedAt / expiresAt. */
    formatTimestamp?: (iso: string) => string;
}
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export declare function ApiKeysPanel<CreateInput, UpdateInput = never>({ adapter, title, createInput, renderCreate, renderEdit, renderKeys, renderPosture, renderShortcuts, className, dialogClassName, formatTimestamp, }: ApiKeysPanelProps<CreateInput, UpdateInput>): import("react").JSX.Element;
