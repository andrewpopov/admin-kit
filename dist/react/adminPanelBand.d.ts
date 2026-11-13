export type AdminBandWidthClass = "regular" | "compact";
export type AdminBandDefault = "auto" | boolean;
type StoredBandState = "collapsed" | "expanded";
export declare const ADMIN_BAND_COMPACT_QUERY = "(max-width: 63.99rem), (max-height: 44.99rem)";
export declare function bandWidthClass(): AdminBandWidthClass;
export declare function bandStorageKey(storageKey: string, widthClass: AdminBandWidthClass): string;
export declare function resolveBandCollapsed(stored: StoredBandState | undefined, defaultCollapsed: AdminBandDefault, widthClass: AdminBandWidthClass): boolean;
export declare function useBandCollapsed(storageKey: string | undefined, defaultCollapsed?: AdminBandDefault): readonly [boolean, (next: boolean) => void];
export {};
