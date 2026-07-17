// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeysPanel } from "../react";
import type { AdminApiKeysPosture, AdminApiKeysSummary, AdminApiKeyQueueItem } from "../core";

const activeKeyOne = {
  id: "key-1",
  name: "Automation",
  maskedKey: "ak_…1234",
  state: "active" as const,
  scopes: ["read"],
  createdAt: "2026-07-10T00:00:00.000Z",
  lastUsedAt: "2026-07-14T00:00:00.000Z",
};

const activeKeyTwoUnused = {
  id: "key-2",
  name: "Unused key",
  maskedKey: "ak_…5678",
  state: "active" as const,
  scopes: ["read"],
  createdAt: "2026-07-01T00:00:00.000Z",
};

afterEach(cleanup);

describe("ApiKeysPanel posture and shortcuts slots", () => {
  it("passes a summary/posture/queue consistent with the adapter's keys", async () => {
    let captured:
      | { summary: AdminApiKeysSummary; posture: AdminApiKeysPosture; queue: readonly AdminApiKeyQueueItem[] }
      | undefined;
    render(
      <ApiKeysPanel
        adapter={{
          list: vi.fn().mockResolvedValue([activeKeyOne, activeKeyTwoUnused]),
          create: vi.fn(),
          revoke: vi.fn(),
        }}
        renderPosture={(controls) => {
          captured = controls;
          return <div>Posture: {controls.posture.kind}</div>;
        }}
      />,
    );

    await screen.findByText("Posture: unused-active");
    expect(captured?.summary.active).toBe(2);
    expect(captured?.summary.unusedActive).toBe(1);
    expect(captured?.posture.kind).toBe("unused-active");
    expect(captured?.queue.some((item) => item.kind === "review-unused")).toBe(true);
  });

  it("renders posture then shortcuts then the create control, in order", async () => {
    const { container } = render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKeyOne]), create: vi.fn(), revoke: vi.fn() }}
        renderPosture={() => <div data-testid="posture-slot">posture</div>}
        renderShortcuts={() => <div data-testid="shortcuts-slot">shortcuts</div>}
      />,
    );

    await screen.findByText("Automation");
    const section = container.querySelector("section");
    const order = Array.from(section?.children ?? []).map((node) =>
      (node as HTMLElement).getAttribute("data-testid") ?? node.tagName,
    );
    const postureIndex = order.indexOf("posture-slot");
    const shortcutsIndex = order.indexOf("shortcuts-slot");
    const createButtonIndex = order.findIndex((tag) => tag === "BUTTON");
    expect(postureIndex).toBeGreaterThanOrEqual(0);
    expect(shortcutsIndex).toBeGreaterThan(postureIndex);
    expect(createButtonIndex).toBeGreaterThan(shortcutsIndex);
  });

  it("renders exactly as before when neither slot is passed", async () => {
    const { container } = render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKeyOne]), create: vi.fn(), revoke: vi.fn() }}
      />,
    );

    await screen.findByText("Automation");
    expect(container.querySelector("[data-testid='posture-slot']")).toBeNull();
    expect(container.querySelector("[data-testid='shortcuts-slot']")).toBeNull();
    expect(container.querySelector(".admin-kit__keys-posture")).toBeNull();
    expect(container.querySelector(".admin-kit__keys-shortcuts")).toBeNull();
  });

  it("re-derives posture after a revoke reload", async () => {
    const list = vi.fn()
      .mockResolvedValueOnce([activeKeyOne, activeKeyTwoUnused])
      .mockResolvedValueOnce([activeKeyOne]);
    const revoke = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiKeysPanel
        adapter={{ list, create: vi.fn(), revoke }}
        renderPosture={(controls) => <div>Posture: {controls.posture.kind}</div>}
      />,
    );

    await screen.findByText("Posture: unused-active");
    fireEvent.click(screen.getAllByRole("button", { name: "Revoke" })[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Revoke key" }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ keyId: "key-2" }));
    await screen.findByText("Posture: healthy");
  });
});
