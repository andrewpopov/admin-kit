import { describe, expect, it } from "vitest";
import { columnBounds, resolveTableFit, type FitColumn } from "../react/adminDataTableFit";

const columns: FitColumn[] = [
  { id: "name", minWidth: 160 },
  { id: "scope", defaultWidth: 200, minWidth: 120 },
  { id: "created", defaultWidth: 140, minWidth: 100, priority: "tertiary" },
  { id: "used", defaultWidth: 140, minWidth: 100, priority: "secondary" },
  { id: "actions", defaultWidth: 160, minWidth: 160 },
];

describe("resolveTableFit", () => {
  it("shows everything at preferred widths when the container is unmeasured", () => {
    const fit = resolveTableFit(undefined, columns);
    expect(fit.visibleIds).toEqual(["name", "scope", "created", "used", "actions"]);
    expect(fit.widths).toEqual({ scope: 200, created: 140, used: 140, actions: 160 });
    expect(fit).toMatchObject({ stacked: false, scrolls: false });
  });

  it("keeps preferred widths when the container is roomy", () => {
    const fit = resolveTableFit(1200, columns);
    expect(fit.widths).toEqual({ scope: 200, created: 140, used: 140, actions: 160 });
    expect(fit.minTableWidth).toBe(160 + 200 + 140 + 140 + 160);
  });

  it("shrinks preferred widths toward minWidth before hiding anything", () => {
    const fit = resolveTableFit(740, columns);
    expect(fit.visibleIds).toHaveLength(5);
    expect(fit.minTableWidth).toBeLessThanOrEqual(740);
    expect(fit.widths.scope).toBeLessThan(200);
    expect(fit.widths.scope).toBeGreaterThanOrEqual(120);
    expect(fit.widths.actions).toBe(160);
  });

  it("hides tertiary, then secondary, columns before stacking", () => {
    expect(resolveTableFit(600, columns).visibleIds).toEqual(["name", "scope", "used", "actions"]);
    const fit = resolveTableFit(450, columns);
    expect(fit.visibleIds).toEqual(["name", "scope", "actions"]);
    expect(fit).toMatchObject({ stacked: false, scrolls: false });
  });

  it("stacks only when the primary columns do not fit the container", () => {
    expect(resolveTableFit(440, columns)).toMatchObject({ stacked: false });
    expect(resolveTableFit(439, columns)).toMatchObject({ stacked: true, scrolls: false });
  });

  it("counts the details column against the container", () => {
    expect(resolveTableFit(450, columns, 96).stacked).toBe(true);
  });

  it("scrolls only when a viewer-resized width exceeds the container", () => {
    const resized = columns.map((column) =>
      column.id === "scope" ? { ...column, override: 700 } : column,
    );
    const fit = resolveTableFit(900, resized);
    expect(fit.scrolls).toBe(true);
    expect(fit.widths.scope).toBe(700);
    expect(fit.minTableWidth).toBeGreaterThan(900);
    expect(resolveTableFit(1400, resized).scrolls).toBe(false);
  });

  it("clamps a resized width to its bounds", () => {
    const resized = columns.map((column) =>
      column.id === "scope" ? { ...column, override: 5000, maxWidth: 300 } : column,
    );
    expect(resolveTableFit(1400, resized).widths.scope).toBe(300);
  });

  it("leaves the fill column unsized but reserves its minimum", () => {
    const fit = resolveTableFit(1200, columns);
    expect(fit.widths.name).toBeUndefined();
    expect(resolveTableFit(150, [{ id: "fill" }]).stacked).toBe(true);
  });

  describe("fill column preferred width", () => {
    const deliveries: FitColumn[] = [
      { id: "delivery" },
      { id: "status", defaultWidth: 120, minWidth: 100 },
      { id: "detail", defaultWidth: 280, minWidth: 160 },
      { id: "attempts", defaultWidth: 90, minWidth: 80 },
      { id: "when", defaultWidth: 150, minWidth: 120 },
    ];
    const details = 96;
    const fillSpace = (container: number, fit: ReturnType<typeof resolveTableFit>) =>
      container - details - Object.values(fit.widths).reduce((total, width) => total + width, 0);

    it("fill column reaches fillWidth before sized columns keep preferred", () => {
      const fit = resolveTableFit(888, deliveries, details);
      expect(fit.visibleIds).toHaveLength(5);
      expect(fillSpace(888, fit)).toBeGreaterThanOrEqual(280);
      expect(fit.widths.detail).toBeGreaterThanOrEqual(160);
      expect(fit.widths.detail).toBeLessThan(280);
    });

    it("honours a custom fillWidth", () => {
      const wide = deliveries.map((column) => (column.id === "delivery" ? { ...column, fillWidth: 320 } : column));
      expect(fillSpace(888, resolveTableFit(888, wide, details))).toBeGreaterThanOrEqual(320);
    });

    it("asks for fillWidth even when the fill column sets a lower minWidth", () => {
      const pinned = deliveries.map((column) => (column.id === "delivery" ? { ...column, minWidth: 160 } : column));
      expect(fillSpace(888, resolveTableFit(888, pinned, details))).toBeGreaterThanOrEqual(280);
    });

    it("lets the fill column fall toward its minimum once sized columns are at theirs", () => {
      const fit = resolveTableFit(760, deliveries, details);
      expect(fit.stacked).toBe(false);
      expect(fit.widths).toEqual({ status: 100, detail: 160, attempts: 80, when: 120 });
      expect(fillSpace(760, fit)).toBeGreaterThanOrEqual(192);
    });

    it("leaves sized columns at their preferred widths when the container is roomy", () => {
      const fit = resolveTableFit(1400, deliveries, details);
      expect(fit.widths).toEqual({ status: 120, detail: 280, attempts: 90, when: 150 });
    });
  });

  it("never renders a column below its header width, and hides or stacks instead", () => {
    const labelled: FitColumn[] = [
      { id: "name", minWidth: 160 },
      { id: "resource", defaultWidth: 240, headerWidth: 101 },
      { id: "extra", defaultWidth: 140, minWidth: 100, priority: "tertiary" },
    ];
    const squeezed = resolveTableFit(300, labelled);
    expect(squeezed.widths.resource).toBe(101);
    expect(squeezed.visibleIds).toEqual(["name", "resource"]);
    expect(resolveTableFit(200, labelled).stacked).toBe(true);
  });

  it("raises maxWidth to the header floor and lifts a stored override below it", () => {
    expect(columnBounds({ minWidth: 50, maxWidth: 80, headerWidth: 101 })).toEqual({
      min: 101,
      max: 101,
    });
    const fit = resolveTableFit(1200, [
      { id: "resource", defaultWidth: 240, headerWidth: 101, override: 50 },
    ]);
    expect(fit.widths.resource).toBe(101);
  });
});
