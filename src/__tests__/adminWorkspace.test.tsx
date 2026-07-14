// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminWorkspace } from "../react";

afterEach(cleanup);

describe("AdminWorkspace", () => {
  it("provides semantic page framing and optional operational slots", () => {
    render(<AdminWorkspace title="Backups" description="Recovery readiness" actions={<button>Run backup</button>} summary={<span>Healthy</span>} toolbar={<input aria-label="Search backups" />}>Records</AdminWorkspace>);
    expect(screen.getByRole("main").textContent).toContain("Backups");
    expect(screen.getByRole("region", { name: "Backups summary" }).textContent).toContain("Healthy");
    expect(screen.getByRole("button", { name: "Run backup" })).toBeTruthy();
  });

  it("can compose inside a host-owned main landmark", () => {
    render(<main><AdminWorkspace as="section" title="Backups">Records</AdminWorkspace></main>);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Backups" })).toBeTruthy();
  });
});
