// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminActionButton } from "../react";

describe("AdminActionButton", () => {
  it("uses a safe button type and applies its declared tone", () => {
    render(<AdminActionButton tone="danger">Revoke key</AdminActionButton>);
    const button = screen.getByRole("button", { name: "Revoke key" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("admin-kit__button--danger");
  });
});
