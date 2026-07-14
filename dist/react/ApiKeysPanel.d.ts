import { type ReactNode } from "react";
import { type AdminApiKey, type AdminApiKeysAdapter } from "../core";
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
}
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export declare function ApiKeysPanel<CreateInput, UpdateInput = never>({ adapter, title, createInput, renderCreate, renderEdit, }: ApiKeysPanelProps<CreateInput, UpdateInput>): import("react").JSX.Element;
