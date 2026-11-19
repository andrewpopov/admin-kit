// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDataTable, AdminPortal, ApiKeysPanel } from "../react";
import { AdminMobileCellLabel } from "../react/AdminTablePrimitives";
import { AdminStatusSummary } from "../react/OperationalPanels";

afterEach(cleanup);

const part = (container: ParentNode, name: string) =>
  Array.from(container.querySelectorAll(`[data-admin-kit-part="${name}"]`));

const scopedKey = {
  id: "key-1",
  name: "Automation",
  maskedKey: "ak_…1234",
  state: "active" as const,
  scopes: ["library.read"],
  createdAt: "2026-07-13T00:00:00.000Z",
};

describe("data-admin-kit-part attributes (PKG-372)", () => {
  it("marks the portal navigation", () => {
    const { container } = render(
      <AdminPortal
        activeSection="a"
        groups={[
          {
            id: "g",
            label: "G",
            sections: [
              { id: "a", label: "A", render: () => <p>A</p> },
              { id: "b", label: "B", render: () => <p>B</p> },
            ],
          },
        ]}
        onSectionChange={() => undefined}
      />,
    );

    expect(part(container, "portal-navigation").map((element) => element.tagName)).toEqual(["NAV"]);
  });

  it("marks the data table scroll region", () => {
    const { container } = render(
      <AdminDataTable
        columns={[{ id: "name", header: "Name", cell: (row: { id: string }) => row.id }]}
        label="People"
        rowKey={(row) => row.id}
        rows={[{ id: "r1" }]}
      />,
    );

    expect(part(container, "table-scroll")).toHaveLength(1);
    expect(part(container, "table-scroll")[0]?.querySelector("table")).not.toBeNull();
  });

  it("marks the phone cell label", () => {
    const { container } = render(<AdminMobileCellLabel>Name</AdminMobileCellLabel>);

    expect(part(container, "mobile-cell-label")[0]?.textContent).toBe("Name");
  });

  it("marks each status with its part and tone", () => {
    const { container } = render(
      <AdminStatusSummary
        items={[
          { label: "Backups", value: "ok", tone: "healthy" },
          { label: "Queue", value: "3" },
        ]}
      />,
    );

    expect(part(container, "status").map((status) => status.getAttribute("data-admin-kit-tone"))).toEqual([
      "healthy",
      "neutral",
    ]);
  });

  it("marks the API key card, create form, scope chip and one-time secret", async () => {
    const create = vi.fn().mockResolvedValue({ key: scopedKey, secret: "made-once" });
    const { container } = render(
      <ApiKeysPanel
        presentation="cards"
        scopeGroups={[{ id: "library", label: "Library", scopes: [{ value: "library.read", label: "Read catalog" }] }]}
        adapter={{ list: vi.fn().mockResolvedValue([scopedKey]), create, revoke: vi.fn() }}
      />,
    );

    await screen.findByText("Automation");
    expect(part(container, "api-key-card")).toHaveLength(1);
    expect(part(container, "scope-chip")[0]?.textContent).toBe("library.read");
    const createForm = part(container, "api-key-create")[0] as HTMLElement;
    expect(createForm.tagName).toBe("DETAILS");

    fireEvent.change(within(createForm).getByLabelText("Name"), { target: { value: "CLI" } });
    fireEvent.click(within(createForm).getByRole("button", { name: "Create API key" }));
    await waitFor(() => expect(part(container, "api-key-secret")).toHaveLength(1));
    expect(part(container, "api-key-secret")[0]?.textContent).toContain("made-once");
  });
});
