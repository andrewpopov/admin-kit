// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminPanelHeader, ApiKeysPanel } from "../react";

afterEach(cleanup);

describe("AdminPanelHeader", () => {
  it("renders nothing when presentation is none", () => {
    const { container } = render(
      <AdminPanelHeader title="Service credentials" presentation="none" />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("still renders an h2 for the section presentation", () => {
    render(<AdminPanelHeader title="Service credentials" presentation="section" />);

    expect(screen.getByRole("heading", { name: "Service credentials", level: 2 })).toBeTruthy();
  });

  it("still renders an h1 for the page presentation", () => {
    render(<AdminPanelHeader title="Service credentials" presentation="page" />);

    expect(screen.getByRole("heading", { name: "Service credentials", level: 1 })).toBeTruthy();
  });
});

describe("ApiKeysPanel with headerPresentation=none", () => {
  it("renders no panel-header band while the section keeps its accessible name", async () => {
    const { container } = render(
      <ApiKeysPanel
        adapter={{ list: async () => [], create: async () => ({} as never), revoke: async () => undefined }}
        headerPresentation="none"
      />,
    );

    await screen.findByRole("region", { name: "API keys" });
    expect(container.querySelector(".admin-kit__panel-header")).toBeNull();
  });
});
