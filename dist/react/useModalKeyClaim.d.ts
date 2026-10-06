/**
 * Returns a function a modal's key trap calls first. It is true for exactly one
 * modal per event: the topmost open one. Claims are recorded per event rather
 * than re-derived, because closing the top modal can pop it from the stack
 * between two listeners of the same keydown.
 */
export declare function useModalKeyClaim(open: boolean): (event: KeyboardEvent) => boolean;
