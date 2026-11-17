// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPagination } from "../react";

afterEach(cleanup);

const renderPagination = (page: number, pageCount: number) => {
  const onPageChange = vi.fn();
  render(
    <AdminPagination label="User pagination" page={page} pageCount={pageCount} onPageChange={onPageChange} />,
  );
  return onPageChange;
};

describe("AdminPagination", () => {
  it("disables previous on the first page and requests the next page", () => {
    const onPageChange = renderPagination(1, 3);
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("disables next on the last page and requests the previous page", () => {
    const onPageChange = renderPagination(3, 3);
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("enables both buttons on a middle page", () => {
    renderPagination(2, 3);
    expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("names the navigation and announces the page politely", () => {
    renderPagination(2, 3);
    expect(screen.getByRole("navigation", { name: "User pagination" })).toBeTruthy();
    const status = screen.getByText("Page 2 of 3");
    expect(status.getAttribute("aria-live")).toBe("polite");
  });

  it("renders nothing for a single page", () => {
    renderPagination(1, 1);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
