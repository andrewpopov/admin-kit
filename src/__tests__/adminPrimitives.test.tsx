// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminCard, AdminField, AdminStack, AdminSwitch, AdminTheme } from "../react";

afterEach(cleanup);

describe("Admin extension primitives", () => {
  it("renders a labelled full-row switch with explicit state", () => {
    render(
      <AdminSwitch
        checked
        label="Public registration"
        description="Anyone can create an account."
      />,
    );

    const control = screen.getByRole("switch", { name: /Public registration/ });
    expect(control.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("On")).toBeTruthy();
  });

  it("keeps product-specific content inside the named core theme", () => {
    render(
      <AdminTheme>
        <AdminCard title="Credential policy" description="Applied to newly created keys.">
          <AdminStack>
            <AdminField label="Expiry" hint="Choose a maximum lifetime.">
              <select aria-label="Expiry">
                <option>30 days</option>
              </select>
            </AdminField>
          </AdminStack>
        </AdminCard>
      </AdminTheme>,
    );

    expect(screen.getByText("Credential policy")).toBeTruthy();
    expect(screen.getByLabelText("Expiry")).toBeTruthy();
    expect(screen.getByText("Choose a maximum lifetime.")).toBeTruthy();
    expect(document.querySelector('[data-admin-kit-theme="core"]')).toBeTruthy();
  });
});
