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

  it("omits the visible workspace title band when a nested panel owns the heading", () => {
    const { container } = render(<AdminWorkspace showHeader={false} title="Users"><h2>Users</h2></AdminWorkspace>);
    expect(screen.getByRole("heading", { name: "Users", level: 2 })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Users" })).toBeTruthy();
    expect(container.querySelector(".admin-kit__workspace-header")).toBeNull();
  });

  it("leaves a bare content boundary for a panel-led page header", () => {
    const { container } = render(<AdminWorkspace presentation="panel-led" title="Users"><h1>Users</h1></AdminWorkspace>);
    expect(screen.getByRole("heading", { name: "Users", level: 1 })).toBeTruthy();
    expect(container.querySelector(".admin-kit__workspace-header")).toBeNull();
    expect(container.querySelector(".admin-kit__workspace-content--bare")).toBeTruthy();
  });
});
