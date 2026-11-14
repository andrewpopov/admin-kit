"use client";
import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface HeaderFloorColumn {
  id: string;
  header: string;
  sortable: boolean;
}

const SORT_ARROW = "↕";
const SORT_GAP = "0.375rem";
const SORT_ARROW_SIZE = "var(--admin-kit-text-body-sm-size)";

const pixels = (value: string) => Number.parseFloat(value) || 0;

function sameFloors(a: Record<string, number>, b: Record<string, number>) {
  const keys = Object.keys(b);
  return Object.keys(a).length === keys.length && keys.every((key) => a[key] === b[key]);
}

/** The widest each header's text, sort arrow and cell padding need, by column id: probes sit in the real header so they inherit its font, transform and spacing. Empty until the table is rendered (not hidden). */
export function measureHeaderFloors(
  wrap: HTMLElement,
  columns: readonly HeaderFloorColumn[],
): Record<string, number> {
  const cell = wrap.querySelector<HTMLElement>("thead th");
  const text = cell?.querySelector<HTMLElement>(".admin-kit__data-table-heading-text");
  if (!cell || !text || cell.getClientRects().length === 0) return {};
  const cellStyle = window.getComputedStyle(cell);
  const textStyle = window.getComputedStyle(text);
  const padding =
    pixels(cellStyle.paddingLeft) +
    pixels(cellStyle.paddingRight) +
    pixels(textStyle.paddingLeft) +
    pixels(textStyle.paddingRight);
  const probes = columns.map((column) => {
    const probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;pointer-events:none";
    probe.textContent = column.header;
    if (column.sortable) {
      const arrow = document.createElement("span");
      arrow.textContent = SORT_ARROW;
      arrow.style.cssText = `margin-inline-start:${SORT_GAP};font-size:${SORT_ARROW_SIZE}`;
      probe.append(arrow);
    }
    cell.append(probe);
    return { id: column.id, probe };
  });
  const floors = Object.fromEntries(
    probes.map(({ id, probe }) => [id, Math.ceil(probe.getBoundingClientRect().width + padding)]),
  );
  for (const { probe } of probes) probe.remove();
  return floors;
}

/** Re-measures when a header's text or sort affordance changes, when web fonts finish loading, and when the table first becomes `shown` (a table mounted hidden measures nothing). */
export function useHeaderFloors(
  wrapRef: RefObject<HTMLElement>,
  columns: readonly HeaderFloorColumn[],
  shown: boolean,
) {
  const [floors, setFloors] = useState<Record<string, number>>({});
  const key = JSON.stringify(columns);
  useIsomorphicLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const measure = () => {
      const next = measureHeaderFloors(wrap, JSON.parse(key) as HeaderFloorColumn[]);
      setFloors((current) => (sameFloors(current, next) ? current : next));
    };
    measure();
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    fonts?.addEventListener?.("loadingdone", measure);
    return () => fonts?.removeEventListener?.("loadingdone", measure);
  }, [wrapRef, key, shown]);
  return floors;
}
