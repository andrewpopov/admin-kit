// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdminConfirmationDialog,
  AdminLabelsProvider,
  AdminPanelStateView,
  EventsPanel,
} from "../react";

afterEach(cleanup);

describe("AdminLabels defaults", () => {
  it("renders the original English chrome strings with no provider", () => {
    render(
      <AdminPanelStateView
        state={{ kind: "error", detail: "Something broke.", onRetry: () => undefined }}
      />,
    );

    expect(screen.getByText("Unable to load this section")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("renders the default Cancel label with no provider", () => {
    render(
      <AdminConfirmationDialog
        open
        title="Danger zone"
        description="This cannot be undone."
        confirmLabel="Confirm"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
  });
});

describe("AdminLabelsProvider overrides", () => {
  it("overrides the loading, retry, and error labels rendered by AdminPanelStateView", () => {
    render(
      <AdminLabelsProvider
        labels={{ loading: "Chargement…", errorTitle: "Section indisponible", retry: "Réessayer" }}
      >
        <AdminPanelStateView state={{ kind: "loading" }} />
      </AdminLabelsProvider>,
    );

    expect(screen.getByText("Chargement…")).toBeTruthy();

    cleanup();

    render(
      <AdminLabelsProvider
        labels={{ loading: "Chargement…", errorTitle: "Section indisponible", retry: "Réessayer" }}
      >
        <AdminPanelStateView
          state={{ kind: "error", detail: "Erreur.", onRetry: () => undefined }}
        />
      </AdminLabelsProvider>,
    );

    expect(screen.getByText("Section indisponible")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("inherits an outer provider's labels through a nested provider", () => {
    // A nested provider (as AdminApp installs one) must layer over the parent
    // context, not reset unspecified strings back to English defaults.
    render(
      <AdminLabelsProvider labels={{ retry: "Réessayer", errorTitle: "Section indisponible" }}>
        <AdminLabelsProvider labels={{ cancel: "Annuler" }}>
          <AdminPanelStateView
            state={{ kind: "error", detail: "Erreur.", onRetry: () => undefined }}
          />
        </AdminLabelsProvider>
      </AdminLabelsProvider>,
    );

    expect(screen.getByText("Section indisponible")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
  });

  it("ignores an explicit undefined override and keeps the inherited value", () => {
    render(
      <AdminLabelsProvider labels={{ cancel: "Annuler" }}>
        <AdminLabelsProvider labels={{ cancel: undefined }}>
          <AdminConfirmationDialog
            open
            title="Danger zone"
            description="This cannot be undone."
            confirmLabel="Confirm"
            onCancel={() => undefined}
            onConfirm={() => undefined}
          />
        </AdminLabelsProvider>
      </AdminLabelsProvider>,
    );

    expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
  });

  it("overrides the Cancel label rendered by AdminConfirmationDialog", () => {
    render(
      <AdminLabelsProvider labels={{ cancel: "Annuler" }}>
        <AdminConfirmationDialog
          open
          title="Danger zone"
          description="This cannot be undone."
          confirmLabel="Confirm"
          onCancel={() => undefined}
          onConfirm={() => undefined}
        />
      </AdminLabelsProvider>,
    );

    expect(screen.getByRole("button", { name: "Annuler" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("overrides pagination labels in a panel using previousPage/nextPage/pageStatus", async () => {
    const list = vi.fn().mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 1,
      total: 2,
      source: { label: "Security audit log", updatedAt: "2026-07-13T00:01:00.000Z" },
    });

    render(
      <AdminLabelsProvider
        labels={{
          previousPage: "Précédent",
          nextPage: "Suivant",
          pageStatus: (page, pageCount) => `Page ${page} sur ${pageCount}`,
        }}
      >
        <EventsPanel adapter={{ list }} />
      </AdminLabelsProvider>,
    );

    expect(await screen.findByRole("button", { name: "Suivant" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Précédent" })).toBeTruthy();
    expect(screen.getByText(/Page 1 sur 2/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
  });
});
