import { type RefObject } from "react";
export interface FillBox {
    /** Document y of the element's top edge, in px. */
    top: number;
    /** Everything that must stay under the element in the viewport: later siblings, margins, padding and borders up to the page edge, in px. */
    below: number;
}
/** The space above the element and the space its ancestors reserve under it, which together decide how tall it can be before the page scrolls. */
export declare function measureFillBox(element: HTMLElement): FillBox;
/**
 * Measures `measureFillBox` again whenever the element, its ancestors, or any sibling along the way
 * resizes, a child is added or removed on that path, or the window resizes.
 */
export declare function useFillBox(ref: RefObject<HTMLElement>, enabled: boolean): FillBox | undefined;
