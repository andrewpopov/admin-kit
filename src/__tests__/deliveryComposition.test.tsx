// @vitest-environment jsdom
// PKG-11: fixture/type tests proving the API-access-vs-delivery composition
// boundary documented in README.md ("### API keys" scope-vs-binding
// paragraph, "### Delivery operations composition"). These panels already
// exist; this file only proves the composition is safe, not new capability.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminApiKey, AdminEvent } from "../core";
import { ApiKeysPanel, EventsPanel, OperationalJobsPanel, SettingsPanel } from "../react";

afterEach(cleanup);

describe("scope vs. binding display (README: API keys)", () => {
  it("renders an operation scope as a scope chip and a principal-binding fact only in details, never merged", async () => {
    const key: AdminApiKey = {
      id: "key-1",
      name: "Integration key",
      maskedKey: "ak_…1234",
      state: "active",
      // The operation scope: permits a category of API call. Never a
      // resource identity by itself.
      scopes: ["requests.write"],
      createdAt: "2026-07-10T00:00:00.000Z",
      // The principal binding: which project/resource the credential acts
      // for. Host-owned, surfaced only as a labeled detail — never a scope.
      details: [{ label: "Project", value: "acme/infra" }],
    };
    render(
      <ApiKeysPanel
        presentation="table"
        adapter={{
          list: vi.fn().mockResolvedValue([key]),
          create: vi.fn(),
          revoke: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Integration key");

    const scopeChips = Array.from(document.querySelectorAll(".admin-kit__scope-chip")).map(
      (node) => node.textContent,
    );
    expect(scopeChips).toEqual(["requests.write"]);
    // The binding's project identity must never appear as a scope chip.
    expect(scopeChips).not.toContain("acme/infra");

    // The binding surfaces only in the details column, keyed by its label.
    const details = screen.getByText("Project").closest("dl");
    expect(details?.textContent).toContain("acme/infra");
    // The scope string must never leak into the binding's details facts.
    expect(details?.textContent).not.toContain("requests.write");
  });
});

describe("delivery history via EventsPanel (README: Delivery operations composition)", () => {
  it("renders a webhook delivery event with its safe outcome and category", async () => {
    const delivery: AdminEvent = {
      id: "delivery-1",
      occurredAt: "2026-07-20T00:00:00.000Z",
      category: "webhook",
      action: "DELIVERY_SENT",
      message: "Delivery attempted",
      severity: "info",
      outcome: "success",
      resource: { label: "acme/infra" },
      metadata: { statusCode: "200", durationMs: "148" },
    };
    render(
      <EventsPanel
        adapter={{
          list: vi.fn().mockResolvedValue({ items: [delivery], page: 1, pageSize: 25, total: 1 }),
          categories: [{ value: "webhook", label: "Webhook" }],
          outcomes: [{ value: "success", label: "Delivered" }],
        }}
        presentation="table"
      />,
    );

    await screen.findByText("Delivery attempted");
    expect(screen.getByText("DELIVERY_SENT")).toBeTruthy();
    expect(screen.getByText("success")).toBeTruthy();
    expect(screen.getByText("acme/infra")).toBeTruthy();
  });
});

describe("delivery-worker health via OperationalJobsPanel (README: Delivery operations composition)", () => {
  it("renders delivery-worker runs through the shared job table", async () => {
    render(
      <OperationalJobsPanel
        title="Delivery workers"
        adapter={{
          list: vi.fn().mockResolvedValue({
            items: [
              {
                id: "run-1",
                label: "Webhook dispatch worker",
                startedAt: "2026-07-20T00:00:00.000Z",
                finishedAt: "2026-07-20T00:00:05.000Z",
                state: "completed" as const,
              },
            ],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
        }}
      />,
    );

    await screen.findByText("Webhook dispatch worker");
    const statePill = screen.getByText("completed", { selector: ".admin-kit__state-pill" });
    expect(statePill.classList.contains("admin-kit__state-pill--completed")).toBe(true);
  });
});

describe("unconfigured delivery route renders safely (README: Delivery operations composition)", () => {
  it("shows each panel's documented empty/loading state instead of throwing when nothing is configured yet", async () => {
    render(
      <>
        <EventsPanel
          adapter={{
            list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 }),
          }}
        />
        <OperationalJobsPanel
          adapter={{
            list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 }),
          }}
          emptyState={{
            title: "No delivery runs yet.",
            detail: "Delivery is not configured for this integration yet.",
          }}
        />
        <SettingsPanel adapter={{ load: vi.fn().mockResolvedValue([]), save: { execute: vi.fn() } }} />
      </>,
    );

    expect(await screen.findByText("No administrative events found.")).toBeTruthy();
    expect(screen.getByText("No delivery runs yet.")).toBeTruthy();
    expect(
      screen.getByText("Delivery is not configured for this integration yet."),
    ).toBeTruthy();
    expect(screen.getByRole("form", { name: "Settings" })).toBeTruthy();
  });
});

describe("secret redaction: no secret URL or value enters an admin adapter (README: extraction threshold)", () => {
  // Models the host-side mapping step README documents: a delivery target
  // URL must be reduced to a safe display value BEFORE it becomes
  // AdminEvent.metadata, since that metadata is adapter-visible (and
  // rendered) content. This mirrors AdminApiKey never carrying a raw secret.
  function redactDeliveryTargetForDisplay(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      // Deliberately excludes url.username/url.password (embedded
      // credentials) and url.search (query-string tokens) — only the
      // protocol, host, and path are safe to display.
      return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
      return "unknown target";
    }
  }

  it("strips embedded credentials and query-string secrets from a delivery target URL before it reaches the adapter", async () => {
    const rawTarget =
      "https://svc:hook_secret_abc123@hooks.example.com/deliver/xyz?token=SUPER_SECRET_TOKEN";
    const safeTarget = redactDeliveryTargetForDisplay(rawTarget);

    // The fixture itself must not carry the secret forward.
    expect(safeTarget).toBe("https://hooks.example.com/deliver/xyz");
    expect(safeTarget).not.toContain("hook_secret_abc123");
    expect(safeTarget).not.toContain("SUPER_SECRET_TOKEN");

    const delivery: AdminEvent = {
      id: "delivery-secret",
      occurredAt: "2026-07-20T00:00:00.000Z",
      category: "webhook",
      action: "DELIVERY_SENT",
      message: "Delivery attempted",
      severity: "info",
      outcome: "success",
      metadata: { target: safeTarget },
    };

    render(
      <EventsPanel
        adapter={{
          list: vi.fn().mockResolvedValue({ items: [delivery], page: 1, pageSize: 25, total: 1 }),
        }}
      />,
    );

    await screen.findByText("Delivery attempted");
    fireEvent.click(screen.getByText("Details"));

    expect(screen.getByText("https://hooks.example.com/deliver/xyz")).toBeTruthy();
    // The raw secret must never survive into rendered, adapter-visible content.
    expect(document.body.innerHTML).not.toContain("hook_secret_abc123");
    expect(document.body.innerHTML).not.toContain("SUPER_SECRET_TOKEN");
  });
});
