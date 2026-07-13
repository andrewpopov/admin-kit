// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeysPanel } from "../react";

const activeKey = {
  id: "key-1",
  name: "Automation",
  maskedKey: "ak_…1234",
  state: "active" as const,
  scopes: ["read"],
  createdAt: "2026-07-13T00:00:00.000Z",
};

afterEach(cleanup);

describe("ApiKeysPanel", () => {
  it("reveals secrets only from create or confirmed rotation responses", async () => {
    const create = vi.fn().mockResolvedValue({ key: activeKey, secret: "create-once" });
    const rotate = vi.fn().mockResolvedValue({ key: activeKey, secret: "rotate-once" });
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create, revoke: vi.fn(), rotate }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    await screen.findByText("create-once");
    expect(create).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "I copied it" }));
    expect(screen.queryByText("create-once")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
    expect(screen.getByRole("dialog").textContent).toContain("Rotate API key");
    expect(rotate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Rotate key" }));

    await screen.findByText("rotate-once");
    expect(rotate).toHaveBeenCalledWith({ keyId: "key-1" });
  });

  it("requires explicit confirmation before revoking a key", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").textContent).toContain("Revoke API key");
    fireEvent.click(screen.getByRole("button", { name: "Revoke key" }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ keyId: "key-1" }));
  });
});
