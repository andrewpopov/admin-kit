"use client";
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface FillBox {
  /** Document y of the element's top edge, in px. */
  top: number;
  /** Everything that must stay under the element in the viewport: later siblings, margins, padding and borders up to the page edge, in px. */
  below: number;
}

const pixels = (value: string) => Number.parseFloat(value) || 0;

function inFlow(element: Element) {
  const { display, position } = getComputedStyle(element);
  return display !== "none" && display !== "contents" && position !== "fixed" && position !== "absolute";
}

/** The space above the element and the space its ancestors reserve under it, which together decide how tall it can be before the page scrolls. */
export function measureFillBox(element: HTMLElement): FillBox {
  let below = 0;
  for (
    let node: HTMLElement = element;
    node !== document.documentElement && node.parentElement;
    node = node.parentElement
  ) {
    const bottom = node.getBoundingClientRect().bottom;
    let extent = bottom + pixels(getComputedStyle(node).marginBottom);
    for (let next = node.nextElementSibling; next; next = next.nextElementSibling) {
      if (inFlow(next)) {
        extent = Math.max(extent, next.getBoundingClientRect().bottom + pixels(getComputedStyle(next).marginBottom));
      }
    }
    const parent = getComputedStyle(node.parentElement);
    below += extent - bottom + pixels(parent.paddingBottom) + pixels(parent.borderBottomWidth);
  }
  return { top: Math.round(element.getBoundingClientRect().top + window.scrollY), below: Math.round(below) };
}

/**
 * Measures `measureFillBox` again whenever the element, its ancestors, or any sibling along the way
 * resizes, a child is added or removed on that path, or the window resizes.
 */
export function useFillBox(ref: RefObject<HTMLElement>, enabled: boolean): FillBox | undefined {
  const [box, setBox] = useState<FillBox>();
  useIsomorphicLayoutEffect(() => {
    const element = ref.current;
    if (!enabled || !element) {
      setBox(undefined);
      return undefined;
    }
    const measure = () => {
      const next = measureFillBox(element);
      setBox((current) => (current?.top === next.top && current.below === next.below ? current : next));
    };
    const resizes = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    const watch = () => {
      resizes?.disconnect();
      for (let node: HTMLElement | null = element; node; node = node.parentElement) {
        resizes?.observe(node);
        for (const sibling of Array.from(node.parentElement?.children ?? [])) resizes?.observe(sibling);
      }
    };
    const rewire = () => {
      watch();
      measure();
    };
    const changes = new MutationObserver(rewire);
    for (let node = element.parentElement; node; node = node.parentElement) {
      changes.observe(node, { childList: true });
    }
    watch();
    measure();
    window.addEventListener("resize", measure);
    return () => {
      resizes?.disconnect();
      changes.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, ref]);
  return box;
}
