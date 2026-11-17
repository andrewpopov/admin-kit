import { expect, test } from "@playwright/test";
import { mount, serveDataTable } from "./data-table-harness";

const pagedJobs = mount(
  `React.createElement(Kit.OperationalJobsPanel, { adapter: jobsAdapter, title: "Retention runs", pageSize: 25 })`,
  `const jobsAdapter = {
    async list({ page }) {
      return { items: [{ id: "job_" + page, label: "Job on page " + page, startedAt: "2024-01-01T15:12:00.000Z", state: "completed" }], page, pageSize: 25, total: 60 };
    },
  };`,
);

const arrow = (page: import("@playwright/test").Page, selector: string, pseudo: string) =>
  page.locator(selector).evaluate((el, p) => getComputedStyle(el, p).content, pseudo);

test("pagination is operable from the keyboard and announces the page", async ({ page }) => {
  await serveDataTable(page, { script: pagedJobs });
  const nav = page.getByRole("navigation", { name: "Operational jobs pagination" });
  await expect(nav.getByText("Page 1 of 3")).toHaveAttribute("aria-live", "polite");
  await expect(nav.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  await nav.getByRole("button", { name: "Next", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(nav.getByText("Page 2 of 3")).toBeVisible();
  await expect(page.getByText("Job on page 2")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(nav.getByText("Page 3 of 3")).toBeVisible();
  await expect(nav.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});

test("pagination arrows point toward their page in left-to-right text", async ({ page }) => {
  await serveDataTable(page, { script: pagedJobs });
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  expect(await arrow(page, ".admin-kit__pagination-previous", "::before")).toBe('"‹" / ""');
  expect(await arrow(page, ".admin-kit__pagination-next", "::after")).toBe('"›" / ""');
});

test("pagination arrows mirror under rtl", async ({ page }) => {
  await serveDataTable(page, {
    script: `document.documentElement.dir = "rtl";` + pagedJobs,
  });
  await expect(page.getByText("Page 1 of 3")).toBeVisible();
  expect(await arrow(page, ".admin-kit__pagination-previous", "::before")).toBe('"›" / ""');
  expect(await arrow(page, ".admin-kit__pagination-next", "::after")).toBe('"‹" / ""');
});
