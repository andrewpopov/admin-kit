import { type ReactElement, type ReactNode } from "react";
import { type AdminApiKey, type AdminApiKeyCreateRequest, type AdminApiKeyQueueItem, type AdminApiKeysAdapter, type AdminApiKeyScopeUpdate, type AdminApiKeysPosture, type AdminApiKeysSummary, type AdminScopeGroup } from "../core";
import { type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
/** Props whose types never depend on the adapter's create/update shapes. */
interface ApiKeysPanelSharedProps {
    /** Product vocabulary for credentials, such as "Personal access tokens". */
    title?: string;
    /** Promote the panel heading and host actions into the route-level header band. */
    headerPresentation?: AdminPanelHeaderPresentation;
    /** Host-owned primary actions displayed beside the panel title. */
    headerActions?: ReactNode;
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
/** The adapter-shaped props and render-prop escape hatches, keyed to CreateInput/UpdateInput. */
interface ApiKeysPanelDataProps<CreateInput, UpdateInput> {
    adapter: AdminApiKeysAdapter<CreateInput, UpdateInput>;
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
}
/**
 * Generic/legacy mode: arbitrary `CreateInput`/`UpdateInput`, all the
 * render-prop escape hatches, and no `scopeGroups`. Behaves exactly as the
 * panel always has.
 */
type ApiKeysPanelGenericProps<CreateInput, UpdateInput = never> = ApiKeysPanelSharedProps & ApiKeysPanelDataProps<CreateInput, UpdateInput> & {
    scopeGroups?: undefined;
    minimumScopeCount?: undefined;
};
/**
 * Built-in mode: opting into the kit's scope-aware create + edit flows pins the
 * adapter to the standard request shapes, so `create`/`update` are type-correct
 * with no casts and a mismatched adapter is a compile error.
 */
type ApiKeysPanelBuiltinProps = ApiKeysPanelSharedProps & ApiKeysPanelDataProps<AdminApiKeyCreateRequest, AdminApiKeyScopeUpdate> & {
    /**
     * Provides the scope vocabulary for the collapsible create card and the
     * inline per-key scope editor. `renderCreate`/`renderEdit`/`renderKeys`
     * still win where provided.
     */
    scopeGroups: readonly AdminScopeGroup[];
    /** Minimum scopes required by the host before create or edit can submit. */
    minimumScopeCount?: number;
};
export type ApiKeysPanelProps<CreateInput, UpdateInput = never> = ApiKeysPanelGenericProps<CreateInput, UpdateInput> | ApiKeysPanelBuiltinProps;
/**
 * Lists safe metadata and reveals a raw secret only from a create/rotate
 * response. The public API is generic over the adapter's create/update input in
 * legacy mode; passing `scopeGroups` switches to the built-in flows and pins the
 * adapter to the standard request shapes (a mismatched adapter is a compile
 * error). The generic props are specialized to those shapes for the concretely
 * typed implementation — the two arms are otherwise identical, so this carries
 * no runtime effect and no `unknown`/`any`.
 */
export declare function ApiKeysPanel<CreateInput, UpdateInput = never>(props: ApiKeysPanelProps<CreateInput, UpdateInput>): ReactElement;
export {};
