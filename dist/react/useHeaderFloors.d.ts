import { type RefObject } from "react";
export interface HeaderFloorColumn {
    id: string;
    header: string;
    sortable: boolean;
}
/** The widest each header's text, sort arrow and cell padding need, by column id: probes sit in the real header so they inherit its font, transform and spacing. Empty until the table is rendered (not hidden). */
export declare function measureHeaderFloors(wrap: HTMLElement, columns: readonly HeaderFloorColumn[]): Record<string, number>;
/** Re-measures when a header's text or sort affordance changes, when web fonts finish loading, and when the table first becomes `shown` (a table mounted hidden measures nothing). */
export declare function useHeaderFloors(wrapRef: RefObject<HTMLElement>, columns: readonly HeaderFloorColumn[], shown: boolean): Record<string, number>;
