// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminWorkspace } from "../react";

describe("AdminWorkspace", () => {
  it("provides semantic page framing and optional operational slots", () => {
    render(<AdminWorkspace title="Backups" description="Recovery readiness" actions={<button>Run backup</button>} summary={<span>Healthy</span>} toolbar={<input aria-label="Search backups" />}>Records</AdminWorkspace>);
    expect(screen.getByRole("main").textContent).toContain("Backups");
    expect(screen.getByRole("region", { name: "Backups summary" }).textContent).toContain("Healthy");
    expect(screen.getByRole("button", { name: "Run backup" })).toBeTruthy();
  });
});
