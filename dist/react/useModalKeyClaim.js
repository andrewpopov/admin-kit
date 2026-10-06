"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useModalKeyClaim = useModalKeyClaim;
const react_1 = require("react");
// Open modals in the order they opened. Each modal installs its own
// capture-phase document keydown trap, so with one dialog stacked on another
// every trap would otherwise act on the same Tab or Escape and fight over focus.
const openModals = [];
const claimedEvents = new WeakSet();
/**
 * Returns a function a modal's key trap calls first. It is true for exactly one
 * modal per event: the topmost open one. Claims are recorded per event rather
 * than re-derived, because closing the top modal can pop it from the stack
 * between two listeners of the same keydown.
 */
function useModalKeyClaim(open) {
    const token = (0, react_1.useRef)({}).current;
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        openModals.push(token);
        return () => {
            openModals.splice(openModals.indexOf(token), 1);
        };
    }, [open, token]);
    return (0, react_1.useCallback)((event) => {
        if (claimedEvents.has(event) || openModals[openModals.length - 1] !== token)
            return false;
        claimedEvents.add(event);
        return true;
    }, [token]);
}
