"use client";
import { useCallback, useEffect, useRef } from "react";

// Open modals in the order they opened. Each modal installs its own
// capture-phase document keydown trap, so with one dialog stacked on another
// every trap would otherwise act on the same Tab or Escape and fight over focus.
const openModals: object[] = [];
const claimedEvents = new WeakSet<Event>();

/**
 * Returns a function a modal's key trap calls first. It is true for exactly one
 * modal per event: the topmost open one. Claims are recorded per event rather
 * than re-derived, because closing the top modal can pop it from the stack
 * between two listeners of the same keydown.
 */
export function useModalKeyClaim(open: boolean): (event: KeyboardEvent) => boolean {
  const token = useRef<object>({}).current;

  useEffect(() => {
    if (!open) return;
    openModals.push(token);
    return () => {
      openModals.splice(openModals.indexOf(token), 1);
    };
  }, [open, token]);

  return useCallback(
    (event) => {
      if (claimedEvents.has(event) || openModals[openModals.length - 1] !== token) return false;
      claimedEvents.add(event);
      return true;
    },
    [token],
  );
}
