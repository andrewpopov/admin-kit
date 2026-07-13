import { type ReactNode } from "react";
import { type AdminApiKeysAdapter } from "../core";
export interface ApiKeysPanelProps<CreateInput> {
    adapter: AdminApiKeysAdapter<CreateInput>;
    createInput?: CreateInput;
    renderCreate?: (controls: {
        create: (input: CreateInput) => void;
        pending: boolean;
    }) => ReactNode;
}
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export declare function ApiKeysPanel<CreateInput>({ adapter, createInput, renderCreate, }: ApiKeysPanelProps<CreateInput>): import("react").JSX.Element;
