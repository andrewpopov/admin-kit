import { type RefObject } from "react";
export interface HeaderFloorColumn {
    id: string;
    header: string;
    sortable: boolean;
}
/** The widest each header's text, sort arrow and cell padding need, by column id: probes sit in the real header so they inherit its font, transform and spacing. Empty until the table is in the DOM. */
export declare function measureHeaderFloors(wrap: HTMLElement, columns: readonly HeaderFloorColumn[]): Record<string, number>;
/** Re-measures when a header's text or sort affordance changes, and when web fonts finish loading. */
export declare function useHeaderFloors(wrapRef: RefObject<HTMLElement>, columns: readonly HeaderFloorColumn[]): Record<string, number>;
