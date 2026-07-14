import { type ReactNode } from "react";
import { type AdminApiKeysAdapter } from "../core";
export interface ApiKeysPanelProps<CreateInput> {
    adapter: AdminApiKeysAdapter<CreateInput>;
    /** Product vocabulary for credentials, such as "Personal access tokens". */
    title?: string;
    createInput?: CreateInput;
    renderCreate?: (controls: {
        /** Resolves true only when the panel accepted and revealed the new secret. */
        create: (input: CreateInput) => Promise<boolean>;
        pending: boolean;
    }) => ReactNode;
}
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export declare function ApiKeysPanel<CreateInput>({ adapter, title, createInput, renderCreate, }: ApiKeysPanelProps<CreateInput>): import("react").JSX.Element;
