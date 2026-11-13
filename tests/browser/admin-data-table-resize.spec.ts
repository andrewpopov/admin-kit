import { expect, test } from "@playwright/test";
import { serveDataTable } from "./data-table-harness";

const script = `
const rows = [
  { id: "a", scope: "cairn.read", owner: "Avery", notes: "Read-only access" },
  { id: "b", scope: "cairn.write", owner: "Blake", notes: "Writes tickets" },
];
const columns = [
  { id: "scope", header: "Scope", defaultWidth: 200, cell: (row) => row.scope },
  { id: "owner", header: "Owner", defaultWidth: 160, cell: (row) => row.owner },
  { id: "notes", header: "Notes", cell: (row) => row.notes },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Scopes", storageKey: "scopes" }),
);
`;

test("resizes and resets a data table column with single clicks only, and the width persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await serveDataTable(page, { script });
  const handle = page.getByRole("separator", { name: "Resize Scope column" });
  await expect(handle).toHaveAttribute("aria-valuenow", "200");

  await handle.click();
  const menu = page.getByRole("group", { name: "Scope column width" });
  await expect(menu).toBeVisible();
  const wrapBox = await page.locator(".admin-kit__data-table-wrap").boundingBox();
  const menuBox = await menu.boundingBox();
  expect(menuBox!.x + menuBox!.width, "menu stays inside the table wrap").toBeLessThanOrEqual(
    wrapBox!.x + wrapBox!.width,
  );
  expect(menuBox!.y + menuBox!.height, "menu is not clipped by the table wrap").toBeLessThanOrEqual(
    wrapBox!.y + wrapBox!.height,
  );

  await menu.getByRole("button", { name: "Widen Scope column" }).click();
  await menu.getByRole("button", { name: "Widen Scope column" }).click();
  await menu.getByRole("button", { name: "Narrow Scope column" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "232");
  expect(await page.evaluate(() => localStorage.getItem("admin-kit:table-widths:scopes"))).toBe(
    JSON.stringify({ scope: 232 }),
  );

  await page.reload();
  await expect(handle).toHaveAttribute("aria-valuenow", "232");

  await handle.click();
  await page.getByRole("button", { name: "Reset Scope column width" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "200");
  await expect(page.getByRole("group", { name: "Scope column width" })).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("admin-kit:table-widths:scopes")),
  ).toBeNull();
});
