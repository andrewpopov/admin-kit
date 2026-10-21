// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReleaseNotesPanel } from "../react";
import {
  validateReleaseNotesPage,
  type ReleaseNotesAdapter,
  type ReleaseNoteDetail,
} from "../core";

afterEach(cleanup);
const note: ReleaseNoteDetail = {
  id: "2026-10-20-health",
  product: "Jun",
  version: "October update",
  releasedAt: "2026-10-20T12:00:00Z",
  summary: "Care plans and feeding controls.",
  notesMarkdown: "Full health details, separate from the short announcement.",
};
function props(adapter: ReleaseNotesAdapter) {
  return {
    adapter,
    hrefForRelease: (id: string) => `/releases/${id}`,
    listHref: "/releases",
    renderNotes: (markdown: string) => <p>{markdown}</p>,
  };
}
function adapter(): ReleaseNotesAdapter {
  return {
    list: vi.fn(async (query) => ({ items: [note], ...query, hasMore: false })),
    get: vi.fn(async () => note),
  };
}

describe("signed-in product release notes", () => {
  it("lists brief previews and deep links without requiring an admin shell", async () => {
    const a = adapter();
    render(<ReleaseNotesPanel {...props(a)} />);
    expect(screen.getByText("Loading release notes…")).toBeTruthy();
    const link = await screen.findByRole("link", { name: "Full release notes" });
    expect(link.getAttribute("href")).toBe("/releases/2026-10-20-health");
    expect(screen.queryByText(note.notesMarkdown)).toBeNull();
    expect(a.get).not.toHaveBeenCalled();
  });

  it("loads full notes directly from a linked release and delegates Markdown safely", async () => {
    render(<ReleaseNotesPanel {...props(adapter())} releaseId={note.id} />);
    expect(await screen.findByText(note.notesMarkdown)).toBeTruthy();
    expect(screen.getByRole("link", { name: "All updates" }).getAttribute("href")).toBe(
      "/releases",
    );
  });

  it("supports missing, empty and retryable failure states", async () => {
    const a = adapter();
    vi.mocked(a.get).mockResolvedValue(null);
    const view = render(<ReleaseNotesPanel {...props(a)} releaseId="missing" />);
    expect(await screen.findByText("Release notes not found")).toBeTruthy();
    view.unmount();
    vi.mocked(a.list)
      .mockRejectedValueOnce(new Error("internal path must not leak"))
      .mockResolvedValueOnce({ items: [], page: 1, pageSize: 10, hasMore: false });
    render(<ReleaseNotesPanel {...props(a)} />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText("internal path must not leak")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No updates yet")).toBeTruthy();
  });

  it("pages the index and validates the response's requested page", async () => {
    const a = adapter();
    vi.mocked(a.list)
      .mockResolvedValueOnce({ items: [note], page: 1, pageSize: 10, hasMore: true })
      .mockResolvedValueOnce({
        items: [{ ...note, id: "older", summary: "Older release." }],
        page: 2,
        pageSize: 10,
        hasMore: false,
      });
    render(<ReleaseNotesPanel {...props(a)} />);
    fireEvent.click(await screen.findByRole("button", { name: "Older" }));
    expect(await screen.findByText("Older release.")).toBeTruthy();
    expect(a.list).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 });
    expect(() =>
      validateReleaseNotesPage({ items: [note], page: 1, pageSize: 1, hasMore: "yes" }),
    ).toThrow();
  });

  it("ignores a delayed previous detail after the route changes", async () => {
    const a = adapter();
    let resolveOld: (value: ReleaseNoteDetail) => void = () => {
      throw new Error("Old request did not start");
    };
    vi.mocked(a.get)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce({ ...note, id: "new", notesMarkdown: "Current release." });
    const view = render(<ReleaseNotesPanel {...props(a)} releaseId="old" />);
    view.rerender(<ReleaseNotesPanel {...props(a)} releaseId="new" />);
    expect(await screen.findByText("Current release.")).toBeTruthy();
    await act(async () => {
      resolveOld({ ...note, notesMarkdown: "Stale release." });
    });
    expect(screen.queryByText("Stale release.")).toBeNull();
  });
});
