// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminStatusSummary, BackupsPanel, SettingsPanel } from "../react";

describe("operational panels", () => {
  it("renders status and backup rows as structured operational data", async () => {
    render(<><AdminStatusSummary items={[{ label: "Recovery", value: "Healthy", tone: "healthy" }]} /><BackupsPanel adapter={{ list: vi.fn().mockResolvedValue({ items: [{ id: "b1", label: "Daily", createdAt: "Today", state: "completed" }], page: 1, pageSize: 25, total: 1 }) }} /></>);
    expect(screen.getByText("Healthy")).toBeTruthy();
    expect(await screen.findByRole("table")).toBeTruthy();
  });
  it("renders settings fields through a host-owned adapter", async () => {
    render(<SettingsPanel adapter={{ load: vi.fn().mockResolvedValue([{ id: "retention", label: "Retention", value: "30" }]), save: { execute: vi.fn() } }} />);
    expect(await screen.findByDisplayValue("30")).toBeTruthy();
  });
});
