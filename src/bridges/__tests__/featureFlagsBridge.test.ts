import { describe, expect, it } from "vitest";
import { createFeatureFlagsAdapter } from "../featureFlagsBridge";
import type { ForeignEvaluatedFlag, ForeignFlagSnapshot } from "../featureFlagsBridge";

function makeSnapshot(
  flags: ForeignEvaluatedFlag[],
  health: "ok" | "store-unavailable" = "ok",
): ForeignFlagSnapshot {
  return { all: () => flags, health };
}

describe("createFeatureFlagsAdapter", () => {
  it("maps ok health to healthy with no detail", async () => {
    const adapter = createFeatureFlagsAdapter({
      flags: { loadSnapshot: () => makeSnapshot([]) },
      registry: [],
    });

    const snapshot = await adapter.list();
    expect(snapshot.storeHealth).toBe("healthy");
    expect(snapshot.storeHealthDetail).toBeUndefined();
  });

  it("maps store-unavailable health to unavailable with a detail", async () => {
    const adapter = createFeatureFlagsAdapter({
      flags: { loadSnapshot: () => makeSnapshot([], "store-unavailable") },
      registry: [],
    });

    const snapshot = await adapter.list();
    expect(snapshot.storeHealth).toBe("unavailable");
    expect(snapshot.storeHealthDetail).toMatch(/unavailable/i);
  });

  it("joins label/description from the registry by key, falling back to the key", async () => {
    const adapter = createFeatureFlagsAdapter({
      flags: {
        loadSnapshot: () =>
          makeSnapshot([
            { key: "new-checkout", enabled: true, source: "store", health: "ok" },
            { key: "undocumented-flag", enabled: false, source: "default", health: "ok" },
          ]),
      },
      registry: [
        { key: "new-checkout", description: "Enables the new checkout flow.", label: "New checkout" },
      ],
    });

    const snapshot = await adapter.list();
    const known = snapshot.flags.find((f) => f.key === "new-checkout")!;
    const unknown = snapshot.flags.find((f) => f.key === "undocumented-flag")!;

    expect(known.label).toBe("New checkout");
    expect(known.description).toBe("Enables the new checkout flow.");
    expect(unknown.label).toBe("undocumented-flag");
  });

  it("is mutable only when the flag is store-sourced AND a mutation seam is provided", async () => {
    const flags = [
      { key: "store-flag", enabled: true, source: "store" as const, health: "ok" as const },
      { key: "env-flag", enabled: true, source: "environment" as const, health: "ok" as const },
    ];

    const withoutSeam = createFeatureFlagsAdapter({
      flags: { loadSnapshot: () => makeSnapshot(flags) },
      registry: [],
    });
    const withoutSeamSnapshot = await withoutSeam.list();
    expect(withoutSeamSnapshot.flags.every((f) => f.mutable === false)).toBe(true);

    const withSeam = createFeatureFlagsAdapter({
      flags: { loadSnapshot: () => makeSnapshot(flags) },
      registry: [],
      setEnabled: () => {},
    });
    const withSeamSnapshot = await withSeam.list();
    expect(withSeamSnapshot.flags.find((f) => f.key === "store-flag")!.mutable).toBe(true);
    expect(withSeamSnapshot.flags.find((f) => f.key === "env-flag")!.mutable).toBe(false);
  });

  it("set-then-reevaluate: setEnabled applies the write then returns the re-evaluated flag", async () => {
    let stored = false;
    const adapter = createFeatureFlagsAdapter({
      flags: {
        loadSnapshot: () =>
          makeSnapshot([{ key: "toggle-me", enabled: stored, source: "store", health: "ok" }]),
      },
      registry: [{ key: "toggle-me", label: "Toggle me" }],
      setEnabled: ({ enabled }) => {
        stored = enabled;
      },
    });

    expect(adapter.setEnabled).toBeDefined();
    const updated = await adapter.setEnabled!({ key: "toggle-me", enabled: true });
    expect(updated.enabled).toBe(true);
    expect(updated.mutable).toBe(true);

    const snapshot = await adapter.list();
    expect(snapshot.flags[0]!.enabled).toBe(true);
  });

  it("throws when setEnabled targets a key absent from the re-evaluated snapshot", async () => {
    const adapter = createFeatureFlagsAdapter({
      flags: { loadSnapshot: () => makeSnapshot([]) },
      registry: [],
      setEnabled: () => {},
    });

    await expect(adapter.setEnabled!({ key: "missing", enabled: true })).rejects.toThrow(/unknown/i);
  });

  it("rejects setEnabled on a non-store-sourced flag without invoking the write seam", async () => {
    let writes = 0;
    const adapter = createFeatureFlagsAdapter({
      flags: {
        loadSnapshot: () =>
          makeSnapshot([{ key: "env-flag", enabled: true, source: "environment", health: "ok" }]),
      },
      registry: [{ key: "env-flag", label: "Env flag" }],
      setEnabled: () => {
        writes += 1;
      },
    });

    await expect(adapter.setEnabled!({ key: "env-flag", enabled: false })).rejects.toThrow(
      /not mutable/i,
    );
    expect(writes).toBe(0);
  });

  it("is not mutable for a store-sourced flag served from a degraded (store-unavailable) snapshot", async () => {
    // Mirrors AsyncFlags: last-known-good rows keep source 'store' while the
    // snapshot's overall health degrades to 'store-unavailable'.
    const adapter = createFeatureFlagsAdapter({
      flags: {
        loadSnapshot: () =>
          makeSnapshot(
            [{ key: "store-flag", enabled: true, source: "store", health: "store-unavailable" }],
            "store-unavailable",
          ),
      },
      registry: [],
      setEnabled: () => {},
    });

    const snapshot = await adapter.list();
    expect(snapshot.flags.find((f) => f.key === "store-flag")!.mutable).toBe(false);
  });

  it("rejects setEnabled on a store-sourced flag from a degraded snapshot without invoking the write seam", async () => {
    let writes = 0;
    const adapter = createFeatureFlagsAdapter({
      flags: {
        loadSnapshot: () =>
          makeSnapshot(
            [{ key: "store-flag", enabled: true, source: "store", health: "store-unavailable" }],
            "store-unavailable",
          ),
      },
      registry: [{ key: "store-flag", label: "Store flag" }],
      setEnabled: () => {
        writes += 1;
      },
    });

    await expect(adapter.setEnabled!({ key: "store-flag", enabled: false })).rejects.toThrow(
      /not mutable/i,
    );
    expect(writes).toBe(0);
  });
});
