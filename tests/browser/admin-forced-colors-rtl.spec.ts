import { expect, test, type Locator, type Page } from "@playwright/test";
import { mount, serveDataTable } from "./data-table-harness";

const rtl = `document.documentElement.dir = "rtl";`;

const controls = mount(
  `React.createElement("div", { style: { display: "grid", gap: "1rem" } },
    React.createElement(Kit.AdminSwitch, { id: "off", checked: false, label: "Off switch" }),
    React.createElement(Kit.AdminSwitch, { id: "on", checked: true, label: "On switch" }),
    React.createElement(Kit.AdminPanelStateView, { state: { kind: "loading", skeletonRows: 3 } }),
    React.createElement(Kit.AdminFilterChip, { label: "Severity: Error", onRemove: () => {} }),
    React.createElement(Kit.AdminStatusSummary, { items: [
      { label: "Plain", value: "Idle" },
      { label: "API", value: "Healthy", tone: "healthy" },
      { label: "Queue", value: "Slow", tone: "warning" },
      { label: "Jobs", value: "Failing", tone: "critical" },
    ] }),
  )`,
);

const peopleTable = `
const rows = [{ id: "a", name: "Avery" }];
const columns = [{ id: "name", header: "Name", defaultWidth: 200, cell: (row) => row.name }];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "People" }),
);`;

const style = (locator: Locator, props: string[]) =>
  locator.evaluate(
    (element, names) => {
      const computed = getComputedStyle(element);
      return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]));
    },
    props,
  );

const canvasColor = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "Canvas";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
  });

const systemColor = (page: Page, keyword: string) =>
  page.evaluate((name) => {
    const probe = document.createElement("div");
    probe.style.color = name;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, keyword);

const hasBorder = async (locator: Locator, side = "top") => {
  const { width, style: borderStyle } = await locator.evaluate((element, edge) => {
    const computed = getComputedStyle(element);
    return {
      width: Number.parseFloat(computed.getPropertyValue(`border-${edge}-width`)),
      style: computed.getPropertyValue(`border-${edge}-style`),
    };
  }, side);
  return width > 0 && borderStyle !== "none";
};

test.describe("forced colors", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await serveDataTable(page, { script: controls });
  });

  for (const state of ["off", "on"] as const) {
    test(`the ${state} switch thumb is distinguishable from its track`, async ({ page }) => {
      const track = page.locator(`#${state} .admin-kit__switch-track`);
      const thumb = track.locator("> span");
      const [trackStyle, thumbStyle] = await Promise.all([
        style(track, ["background-color", "border-top-style", "border-top-width"]),
        style(thumb, ["background-color"]),
      ]);
      expect(thumbStyle["background-color"]).not.toBe(trackStyle["background-color"]);
    });
  }

  test("the on switch track differs from the off switch track", async ({ page }) => {
    const on = await style(page.locator("#on .admin-kit__switch-track"), ["background-color"]);
    const off = await style(page.locator("#off .admin-kit__switch-track"), ["background-color"]);
    expect(on["background-color"]).not.toBe(off["background-color"]);
  });

  test("skeleton bars are drawn in a colour other than the canvas", async ({ page }) => {
    const bar = page.locator(".admin-kit__skeleton-bar").first();
    const barStyle = await style(bar, ["background-color"]);
    expect(barStyle["background-color"]).not.toBe(await canvasColor(page));
  });

  test("the filter chip has a border", async ({ page }) => {
    expect(await hasBorder(page.locator(".admin-kit__filter-chip"))).toBe(true);
  });

  test("status tones stay distinguishable without colour", async ({ page }) => {
    const styles = await Promise.all(
      ["neutral", "healthy", "warning", "critical"].map((tone) =>
        style(page.locator(`.admin-kit__status--${tone}`), ["border-inline-start-style"]),
      ),
    );
    expect(new Set(styles.map((entry) => entry["border-inline-start-style"])).size).toBe(4);
  });

  test("focus rings are still drawn", async ({ page }) => {
    const chipButton = page.getByRole("button", { name: "Remove filter: Severity: Error" });
    await page.keyboard.press("Tab");
    await chipButton.focus();
    await expect(chipButton).toBeFocused();
    const ring = await style(chipButton, ["outline-style", "outline-width", "outline-color"]);
    expect(ring["outline-style"]).not.toBe("none");
    expect(ring["outline-color"]).toBe(await systemColor(page, "Highlight"));
    expect(Number.parseFloat(ring["outline-width"])).toBeGreaterThan(0);
  });

  test("the column resize divider is drawn in a text colour", async ({ page }) => {
    await serveDataTable(page, {
      script: `
const rows = [{ id: "a", name: "Avery" }];
const columns = [{ id: "name", header: "Name", defaultWidth: 200, cell: (row) => row.name }];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "People" }),
);`,
    });
    const divider = await page
      .getByRole("separator", { name: "Resize Name column" })
      .evaluate((element) => getComputedStyle(element, "::after").backgroundColor);
    expect(divider).not.toBe(await canvasColor(page));
  });
});

test.describe("rtl", () => {
  test.beforeEach(async ({ page }) => {
    await serveDataTable(page, { script: rtl + controls });
  });

  for (const state of ["off", "on"] as const) {
    test(`the ${state} switch thumb stays inside its track`, async ({ page }) => {
      const track = await page.locator(`#${state} .admin-kit__switch-track`).boundingBox();
      const thumb = await page.locator(`#${state} .admin-kit__switch-track > span`).boundingBox();
      expect(thumb!.x).toBeGreaterThanOrEqual(track!.x);
      expect(thumb!.x + thumb!.width).toBeLessThanOrEqual(track!.x + track!.width);
    });
  }

  test("the on thumb sits at the track's left end and the off thumb at its right end", async ({
    page,
  }) => {
    const centre = async (state: string) => {
      const track = (await page.locator(`#${state} .admin-kit__switch-track`).boundingBox())!;
      const thumb = (await page.locator(`#${state} .admin-kit__switch-track > span`).boundingBox())!;
      return thumb.x + thumb.width / 2 - (track.x + track.width / 2);
    };
    expect(await centre("off")).toBeGreaterThan(0);
    expect(await centre("on")).toBeLessThan(0);
  });

  test("the status accent is on the right edge", async ({ page }) => {
    const accent = await style(page.locator(".admin-kit__status--healthy"), [
      "border-left-width",
      "border-right-width",
    ]);
    expect(accent["border-left-width"]).toBe("0px");
    expect(accent["border-right-width"]).toBe("3px");
  });

  test("text aligns to the start edge", async ({ page }) => {
    const align = await style(page.locator("#on"), ["text-align"]);
    expect(align["text-align"]).toBe("start");
  });

  test("table cells align to the start edge", async ({ page }) => {
    await serveDataTable(page, { script: rtl + peopleTable });
    for (const selector of ["th", "td"]) {
      const align = await style(page.locator(`.admin-kit__data-table ${selector}`).first(), ["text-align"]);
      expect(align["text-align"], selector).toBe("start");
    }
  });

  test("dragging the divider outward grows the column", async ({ page }) => {
    await serveDataTable(page, { script: rtl + peopleTable });
    const handle = page.getByRole("separator", { name: "Resize Name column" });
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 60, y, { steps: 6 });
    await page.mouse.up();
    expect(Number(await handle.getAttribute("aria-valuenow"))).toBeGreaterThan(200);
  });

  test("ArrowLeft grows and ArrowRight shrinks a resized column", async ({ page }) => {
    await serveDataTable(page, { script: rtl + peopleTable });
    const handle = page.getByRole("separator", { name: "Resize Name column" });
    await handle.focus();
    await expect(handle).toHaveAttribute("aria-valuenow", "200");
    await page.keyboard.press("ArrowLeft");
    const grown = Number(await handle.getAttribute("aria-valuenow"));
    expect(grown).toBeGreaterThan(200);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    expect(Number(await handle.getAttribute("aria-valuenow"))).toBeLessThan(grown);
  });
});
