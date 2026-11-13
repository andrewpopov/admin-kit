import { expect, test } from "@playwright/test";
import { jobsPanel, keysPanel, mount, serveDataTable, usersPanel } from "./data-table-harness";

const eventsPanel = mount(
  `React.createElement(Kit.EventsPanel, { adapter: eventsAdapter, columns: ["occurred", "event", "outcome"], presentation: "table" })`,
  `const eventsAdapter = {
    async list() {
      return { items: [{ id: "evt_1", occurredAt: "2024-01-01T15:12:00.000Z", category: "assistant", action: "assistant.task.completed", message: "Assistant task finished after a long-running catalog reconciliation", severity: "info", outcome: "success", metadata: { task: "task-0123456789abcdef" } }], page: 1, pageSize: 25, total: 1 };
    },
  };`,
);

const overflow = () => {
  const wrap = document.querySelector<HTMLElement>(".admin-kit__data-table-wrap")!;
  return wrap.scrollWidth - wrap.clientWidth;
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

test("ApiKeysPanel keeps its fixed Actions column at 780px instead of squeezing the buttons", async ({
  page,
}) => {
  await serveDataTable(page, { script: keysPanel, containerWidth: 780 });
  const row = page.locator("tbody tr").first();
  await expect(row).toBeVisible();
  const actions = page.locator('col[data-column="actions"]');
  expect(await actions.evaluate((col) => (col as HTMLElement).style.width)).toBe("168px");
  expect((await row.getByRole("button", { name: "Revoke" }).boundingBox())!.width).toBeGreaterThan(
    70,
  );
  expect((await row.boundingBox())!.height).toBeLessThan(170);
  expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
});

test("UsersPanel keeps its fixed Actions column at 780px", async ({ page }) => {
  await serveDataTable(page, { script: usersPanel, containerWidth: 780 });
  const reset = page.getByRole("button", { name: /Reset password for/ });
  await expect(reset).toBeVisible();
  expect((await reset.boundingBox())!.width).toBeGreaterThan(90);
  expect((await page.locator("tbody tr").first().boundingBox())!.height).toBeLessThan(170);
  expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
});

test("ApiKeysPanel reaches hidden columns through the row details", async ({ page }) => {
  await serveDataTable(page, { script: keysPanel, containerWidth: 700 });
  await expect(page.getByRole("columnheader", { name: "Created" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Expires" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Scope" })).toHaveCount(1);
  await page.locator(".admin-kit__data-table-toggle").first().click();
  const values = page.locator(".admin-kit__data-table-hidden-values");
  await expect(values).toContainText("Created");
  await expect(values).toContainText("Last used");
  await expect(values).toContainText("Expires");
  await expect(values).toContainText("never");
});

test("ApiKeysPanel drops Last used before Expires as the container narrows", async ({ page }) => {
  await serveDataTable(page, { script: keysPanel, containerWidth: 780 });
  await expect(page.getByRole("columnheader", { name: "Expires" })).toHaveCount(1);
  await expect(page.getByRole("columnheader", { name: "Last used" })).toHaveCount(0);
});

test("UsersPanel stacks at 320px with Reset password inside the wrap and no sideways scroll", async ({
  page,
}) => {
  await serveDataTable(page, { script: usersPanel, containerWidth: 280 });
  const wrap = page.locator(".admin-kit__data-table-wrap");
  const reset = page.getByRole("button", { name: /Reset password for/ });
  await expect(reset).toBeVisible();
  expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
  const [wrapBox, resetBox] = await Promise.all([wrap.boundingBox(), reset.boundingBox()]);
  expect(resetBox!.x).toBeGreaterThanOrEqual(wrapBox!.x);
  expect(resetBox!.x + resetBox!.width).toBeLessThanOrEqual(wrapBox!.x + wrapBox!.width);
});

test("EventsPanel stacks at 280px with a visible Outcome label and no overflow", async ({
  page,
}) => {
  await serveDataTable(page, { script: eventsPanel, containerWidth: 280 });
  await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-stacked", "true");
  expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
  await expect(page.locator(".admin-kit__mobile-cell-label", { hasText: "Outcome" })).toBeVisible();
});

test("OperationalJobsPanel rows become grid cards at 280px", async ({ page }) => {
  await serveDataTable(page, { script: jobsPanel, containerWidth: 280 });
  await expect(page.locator("tbody tr").first()).toHaveCSS("display", "grid");
  expect(await page.evaluate(overflow)).toBeLessThanOrEqual(0);
  await expect(page.locator(".admin-kit__mobile-cell-label", { hasText: "Started" })).toBeVisible();
});
