import { test as base, type Browser } from "@playwright/test";

export { expect } from "@playwright/test";

// One WebKit browser stops loading after about 64 pages, closed or not (`page.goto` hangs until the test times out),
// so a worker's WebKit browser is relaunched before that. Tests in a worker run in turn, so its earlier contexts are closed.
const WEBKIT_PAGES_PER_BROWSER = 40;

// Firefox does not support `isMobile` (it hangs `setViewportSize`), so `(pointer: coarse)` comes from its pointer-capabilities pref (1 = coarse).
const FIREFOX_COARSE_POINTER = { "ui.primaryPointerCapabilities": 1 };

export const test = base.extend<object, { browser: Browser; coarsePointer: boolean }>({
  coarsePointer: [false, { option: true, scope: "worker" }],
  hasTouch: async ({ coarsePointer }, use) => use(coarsePointer),
  isMobile: async ({ browserName, coarsePointer }, use) => use(coarsePointer && browserName !== "firefox"),
  browser: [
    async ({ playwright, browserName, launchOptions, coarsePointer }, use) => {
      const launch = () =>
        playwright[browserName].launch(
          browserName === "firefox" && coarsePointer
            ? { ...launchOptions, firefoxUserPrefs: FIREFOX_COARSE_POINTER }
            : launchOptions,
        );
      let current = await launch();
      let pages = 0;
      const rotating = new Proxy(current, {
        get(_target, property) {
          if (property === "newContext" && browserName === "webkit") {
            return async (...args: Parameters<Browser["newContext"]>) => {
              if (pages >= WEBKIT_PAGES_PER_BROWSER) {
                await current.close();
                current = await launch();
                pages = 0;
              }
              const context = await current.newContext(...args);
              context.on("page", () => {
                pages += 1;
              });
              return context;
            };
          }
          const value = Reflect.get(current, property);
          return typeof value === "function" ? value.bind(current) : value;
        },
      });
      await use(rotating);
      await current.close();
    },
    { scope: "worker" },
  ],
});
