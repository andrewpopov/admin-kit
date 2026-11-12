import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

const origin = "http://admin-kit.test";
const umd = (name: string, file: string) => resolve("node_modules", name, "umd", file);
const read = (path: string) => readFileSync(path, "utf8");

const prelude = `
const mods = {
  react: React,
  "react/jsx-runtime": {
    jsx: (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key }),
    Fragment: React.Fragment,
  },
};
mods["react/jsx-runtime"].jsxs = mods["react/jsx-runtime"].jsx;
const load = (source) => {
  const module = { exports: {} };
  new Function("require", "module", "exports", source)((name) => mods[name], module, module.exports);
  return module.exports;
};
mods["./AdminTablePrimitives"] = load(window.__primitives);
mods["./adminDataTableFit"] = load(window.__fit);
const { AdminDataTable } = load(window.__dataTable);
`;

export async function serveDataTable(
  page: Page,
  { script, containerWidth }: { script: string; containerWidth?: number },
) {
  const body = (path: string) => ({ body: read(path), contentType: "text/javascript" });
  const files: Record<string, { body: string; contentType: string }> = {
    "/": {
      contentType: "text/html",
      body: `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head>
<body><div class="admin-kit admin-kit--theme-core" style="padding: 2rem"><div id="root" style="${
        containerWidth === undefined ? "" : `width: ${containerWidth}px`
      }"></div></div>
<script src="/react.js"></script><script src="/react-dom.js"></script>
<script src="/sources.js"></script><script src="/bootstrap.js"></script></body></html>`,
    },
    "/styles.css": { body: read("dist/styles.css"), contentType: "text/css" },
    "/react.js": body(umd("react", "react.development.js")),
    "/react-dom.js": body(umd("react-dom", "react-dom.development.js")),
    "/sources.js": {
      contentType: "text/javascript",
      body: `window.__primitives = ${JSON.stringify(read("dist/react/AdminTablePrimitives.js"))};
window.__dataTable = ${JSON.stringify(read("dist/react/AdminDataTable.js"))};
window.__fit = ${JSON.stringify(read("dist/react/adminDataTableFit.js"))};`,
    },
    "/bootstrap.js": { body: prelude + script, contentType: "text/javascript" },
  };
  await page.route(`${origin}/**`, (route) => {
    const file = files[new URL(route.request().url()).pathname];
    return file ? route.fulfill(file) : route.fulfill({ status: 404 });
  });
  await page.goto(`${origin}/`);
}

