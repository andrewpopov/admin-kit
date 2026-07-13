import { type AdminApiKeysAdapter } from "../core";
export interface ApiKeysPanelProps<CreateInput> {
    adapter: AdminApiKeysAdapter<CreateInput>;
    createInput: CreateInput;
}
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
export declare function ApiKeysPanel<CreateInput>({ adapter, createInput, }: ApiKeysPanelProps<CreateInput>): import("react").JSX.Element;
