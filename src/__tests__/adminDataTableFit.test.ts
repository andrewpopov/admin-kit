import { describe, expect, it } from "vitest";
import { resolveTableFit, type FitColumn } from "../react/adminDataTableFit";

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
});
