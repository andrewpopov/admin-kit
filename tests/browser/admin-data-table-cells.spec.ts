import { expect, test, type Page } from "@playwright/test";
import {
  eventsPanel,
  jobsPanel,
  keysPanel,
  mount,
  serveDataTable,
  usersControlsPanel,
  usersCustomColumnsPanel,
  usersPanel,
} from "./data-table-harness";

const panels = {
  ApiKeysPanel: keysPanel,
  UsersPanel: usersPanel,
  "UsersPanel with controls": usersControlsPanel,
  "UsersPanel with custom columns": usersCustomColumnsPanel,
  OperationalJobsPanel: jobsPanel,
  EventsPanel: eventsPanel,
};

const cellOverflow = () =>
  [...document.querySelectorAll<HTMLElement>("tbody td:not([data-empty])")]
    .filter((cell) => !cell.matches(".admin-kit__table-cell--truncate"))
    .flatMap((cell) => {
      const value = cell.querySelector<HTMLElement>(".admin-kit__cell-value");
      return value && value.scrollWidth > value.clientWidth + 1
        ? [`${cell.textContent} (${value.scrollWidth} > ${value.clientWidth})`]
        : [];
    });

const clippedHeaders = () =>
  [
    ...document.querySelectorAll<HTMLElement>(
      ".admin-kit__data-table:not([data-stacked]) .admin-kit__data-table-heading-text",
    ),
  ].flatMap(
    (heading) =>
      heading.scrollWidth > heading.clientWidth + 1
        ? [`${heading.textContent} (${heading.scrollWidth} > ${heading.clientWidth})`]
        : [],
  );

const selectsFitTheirOptions = () =>
  [...document.querySelectorAll<HTMLSelectElement>("tbody select")].flatMap((select) => {
    const style = getComputedStyle(select);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = style.font;
    const widest = Math.max(
      ...[...select.options].map((option) => context.measureText(option.text).width),
    );
    const arrowAndPadding = 28;
    return select.getBoundingClientRect().width < widest + arrowAndPadding
      ? [
          `${select.getAttribute("aria-label")}: ${select.getBoundingClientRect().width} < ${widest}`,
        ]
      : [];
  });

const interactiveOverlaps = () => {
  const boxes = [
    ...document.querySelectorAll<HTMLElement>("tbody :is(button, select, input, a[href])"),
  ]
    .map((element) => ({ element, box: element.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 0 && box.height > 0);
  const overlaps: string[] = [];
  boxes.forEach((a, index) =>
    boxes.slice(index + 1).forEach((b) => {
      const intersects =
        a.box.left < b.box.right - 1 &&
        b.box.left < a.box.right - 1 &&
        a.box.top < b.box.bottom - 1 &&
        b.box.top < a.box.bottom - 1;
      if (intersects)
        overlaps.push(`${a.element.outerHTML.slice(0, 60)} x ${b.element.outerHTML.slice(0, 60)}`);
    }),
  );
  return overlaps;
};

const wrapOverflow = () => {
  const wrap = document.querySelector<HTMLElement>(".admin-kit__data-table-wrap")!;
  return wrap.scrollWidth - wrap.clientWidth;
};

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

for (const [name, script] of Object.entries(panels)) {
  for (const containerWidth of [780, 888, 1200]) {
    test(`${name} at ${containerWidth}px: cell content fits its cell and controls never overlap`, async ({
      page,
    }) => {
      await serveDataTable(page, { script, containerWidth });
      await expect(page.locator("tbody tr").first()).toBeVisible();
      expect(await page.evaluate(clippedHeaders)).toEqual([]);
      expect(await page.evaluate(cellOverflow)).toEqual([]);
      expect(await page.evaluate(selectsFitTheirOptions)).toEqual([]);
      expect(await page.evaluate(interactiveOverlaps)).toEqual([]);
      expect(await page.evaluate(wrapOverflow)).toBeLessThanOrEqual(0);
    });
  }
}

for (const containerWidth of [900, 1040]) {
  test(`EventsPanel default Occurred column at ${containerWidth}px never clips a column header`, async ({
    page,
  }) => {
    await serveDataTable(page, { script: eventsPanel, containerWidth });
    await expect(page.locator("tbody tr").first()).toBeVisible();
    expect(await page.evaluate(clippedHeaders)).toEqual([]);
    expect(await page.evaluate(wrapOverflow)).toBeLessThanOrEqual(0);
  });
}

test("UsersPanel never squeezes a Role or Status select below its options: it stacks first", async ({
  page,
}) => {
  await serveDataTable(page, { script: usersControlsPanel, containerWidth: 700 });
  await expect(page.locator("tbody tr").first()).toBeVisible();
  expect(await page.evaluate(selectsFitTheirOptions)).toEqual([]);
  expect(await page.evaluate(interactiveOverlaps)).toEqual([]);
});

test("UsersPanel custom columns drop Email and Created, keep Updated truncated, and show the Delete beside both selects", async ({
  page,
}) => {
  await serveDataTable(page, { script: usersCustomColumnsPanel, containerWidth: 888 });
  await expect(page.getByRole("columnheader", { name: "Email" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Created" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Updated" })).toHaveCount(1);
  const row = page.locator("tbody tr").first();
  const [status, remove] = await Promise.all([
    row.getByRole("combobox", { name: /^Status/ }).boundingBox(),
    row.getByRole("button", { name: /^Delete/ }).boundingBox(),
  ]);
  expect(status!.x + status!.width).toBeLessThanOrEqual(remove!.x);
});

const labelTable = (labels: string[]) =>
  mount(
    `React.createElement(Kit.AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Runs" })`,
    `const rows = [{ id: "r1", value: "A value long enough to sit beside its label on a card" }];
const columns = [{ id: "title", header: "Run", cardSlot: "title", cell: () => "Run 1" },
  ${labels
    .map(
      (label, index) =>
        `{ id: "c${index}", header: "${label}", minWidth: 120, defaultWidth: 140, ${index % 2 ? 'cardSlot: "meta", ' : ""}cell: (row) => row.value }`,
    )
    .join(",\n  ")}];`,
  );

const labelMetrics = () =>
  [...document.querySelectorAll<HTMLElement>(".admin-kit__mobile-cell-label")]
    .filter((label) => label.getBoundingClientRect().width > 0)
    .map((label) => {
      const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
      return {
        text: label.textContent,
        lines: Math.round(label.getBoundingClientRect().height / lineHeight),
        spills: label.scrollWidth > label.clientWidth + 1,
      };
    });

for (const containerWidth of [320, 390]) {
  test(`stacked cards at ${containerWidth}px keep every label on one line, never mid-word`, async ({
    page,
  }) => {
    await serveDataTable(page, {
      script: labelTable(["Deployment", "Backup", "Verification", "Environment"]),
      containerWidth,
    });
    await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute(
      "data-stacked",
      "true",
    );
    const metrics = await page.evaluate(labelMetrics);
    expect(metrics.map((metric) => metric.text)).toEqual([
      "Deployment",
      "Backup",
      "Verification",
      "Environment",
    ]);
    for (const metric of metrics)
      expect(metric, metric.text ?? "").toMatchObject({ lines: 1, spills: false });
  });
}

test("stacked cards under 340px put the label above the value", async ({ page }) => {
  await serveDataTable(page, { script: labelTable(["Deployment", "Backup"]), containerWidth: 300 });
  const pairs = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("tbody td:not([data-card-slot=title])")].map(
      (cell) => ({
        label: cell.querySelector(".admin-kit__mobile-cell-label")!.getBoundingClientRect().bottom,
        value: cell.querySelector(".admin-kit__cell-value")!.getBoundingClientRect().top,
      }),
    ),
  );
  expect(pairs).toHaveLength(2);
  for (const pair of pairs) expect(pair.label).toBeLessThanOrEqual(pair.value);
});

const emptyTable = mount(
  `React.createElement(Kit.AdminDataTable, { columns, rows: [{ id: "r1" }], rowKey: (row) => row.id, label: "Empty" })`,
  `const columns = [
  { id: "name", header: "Name", minWidth: 100, cardSlot: "title", cell: () => "Run 1" },
  { id: "nothing", header: "Nothing", defaultWidth: 100, cell: () => null },
  { id: "no", header: "No", defaultWidth: 100, cell: () => false },
  { id: "blank", header: "Blank", defaultWidth: 100, cell: () => "" },
  { id: "fragment", header: "Fragment", defaultWidth: 100, cardSlot: "meta", cell: () => React.createElement(React.Fragment, null, null, false) },
  { id: "zero", header: "Zero", defaultWidth: 100, cell: () => 0 },
];`,
);

test("a stacked card shows neither a label nor a row for a cell that renders nothing", async ({
  page,
}) => {
  await serveDataTable(page, { script: emptyTable, containerWidth: 390 });
  await expect(page.locator(".admin-kit__data-table-wrap")).toHaveAttribute("data-stacked", "true");
  const labels = page.locator("tbody .admin-kit__mobile-cell-label:visible");
  await expect(labels).toHaveText(["Zero"]);
  await expect(page.locator("tbody td:visible")).toHaveCount(2);
});

test("a table keeps an empty cell as a cell, for the host to fill", async ({ page }) => {
  await serveDataTable(page, { script: emptyTable, containerWidth: 900 });
  await expect(page.locator("tbody td")).toHaveCount(6);
  await expect(page.locator("tbody td:visible")).toHaveCount(6);
});

const detailsTable = mount(
  `React.createElement(Kit.AdminDataTable, { columns, rows: [{ id: "r1" }], rowKey: (row) => row.id, label: "Runs", renderDetails: () => "More", rowLabel: () => "run 1" })`,
  `const columns = [{ id: "name", header: "Name", cardSlot: "title", cell: () => "Run 1" }, { id: "state", header: "State", defaultWidth: 120, cell: () => "ok" }];`,
);

test("the row details toggle is a 44px target when stacked", async ({ page }) => {
  await serveDataTable(page, { script: detailsTable, containerWidth: 300 });
  const box = await page.locator(".admin-kit__data-table-toggle").boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test.describe("coarse pointer", () => {
  test.use({ hasTouch: true });

  test("the row details toggle is a 44px target in a wide table too", async ({ page }) => {
    await serveDataTable(page, { script: detailsTable, containerWidth: 900 });
    await expect(page.locator(".admin-kit__data-table-wrap")).not.toHaveAttribute("data-stacked");
    const box = await page.locator(".admin-kit__data-table-toggle").boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test("the row details toggle keeps its compact size with a fine pointer on desktop", async ({
  page,
}) => {
  await serveDataTable(page, { script: detailsTable, containerWidth: 900 });
  const box = await page.locator(".admin-kit__data-table-toggle").boundingBox();
  expect(box!.height).toBeLessThan(40);
});

const dangerSamples = `
document.getElementById("root").innerHTML = [
  '<button class="admin-kit__button admin-kit__button--danger" id="danger">Delete</button>',
  '<span class="admin-kit__state-pill admin-kit__state-pill--failed" id="pill">failed</span>',
  '<p class="admin-kit__action-error" id="error">Unable to update</p>',
  '<span class="admin-kit__membership-role--danger" id="role">Owner</span>',
].join("");`;

const contrastOf = (page: Page) =>
  page.evaluate(() => {
    const parse = (value: string) => {
      const channels = value.match(/[\d.]+/g)!.map(Number);
      return channels.slice(0, 3).map((channel) => {
        const unit = channel / 255;
        return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      });
    };
    const luminance = ([r, g, b]: number[]) => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    return Object.fromEntries(
      ["danger", "pill", "error", "role"].map((id) => {
        const style = getComputedStyle(document.getElementById(id)!);
        const [a, b] = [luminance(parse(style.color)), luminance(parse(style.backgroundColor))];
        return [id, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)];
      }),
    );
  });

for (const theme of ["light", "dark"]) {
  test(`danger buttons and pills reach 4.5:1 in the ${theme} theme`, async ({ page }) => {
    await serveDataTable(page, { script: dangerSamples, containerWidth: 600 });
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });
    await page.evaluate(
      (name) => document.querySelector(".admin-kit")!.classList.toggle("dark", name === "dark"),
      theme,
    );
    const ratios = await contrastOf(page);
    for (const [id, ratio] of Object.entries(ratios)) expect(ratio, id).toBeGreaterThanOrEqual(4.5);
  });
}
