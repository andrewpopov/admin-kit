import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Page } from "@playwright/test";

const origin = "http://admin-kit.test";
const umd = (name: string, file: string) => resolve("node_modules", name, "umd", file);
const read = (path: string) => readFileSync(path, "utf8");

function distSources(dir = "dist", prefix = ""): Record<string, string> {
  return Object.fromEntries(
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? Object.entries(distSources(join(dir, entry.name), `${prefix}${entry.name}/`))
        : entry.name.endsWith(".js")
          ? [[`${prefix}${entry.name}`, read(join(dir, entry.name))]]
          : [],
    ),
  );
}

// Runs the real built kit (CommonJS in dist/) in the page, resolving its relative requires.
const prelude = `
const external = {
  react: React,
  "react-dom": ReactDOM,
  "react/jsx-runtime": {
    jsx: (type, props, key) => React.createElement(type, key === undefined ? props : { ...props, key }),
    Fragment: React.Fragment,
  },
};
external["react/jsx-runtime"].jsxs = external["react/jsx-runtime"].jsx;
const cache = {};
const resolvePath = (from, name) => {
  const parts = from.split("/").slice(0, -1);
  for (const part of name.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  const base = parts.join("/");
  return [base + ".js", base + "/index.js"].find((path) => path in window.__dist);
};
const requireFrom = (from) => (name) => {
  if (name in external) return external[name];
  const path = resolvePath(from, name);
  if (!path) throw new Error("unresolved " + name + " from " + from);
  if (!cache[path]) {
    const module = { exports: {} };
    cache[path] = module;
    new Function("require", "module", "exports", window.__dist[path])(requireFrom(path), module, module.exports);
  }
  return cache[path].exports;
};
const Kit = requireFrom("entry.js")("./index");
const { AdminDataTable } = Kit;
`;

export async function serveDataTable(
  page: Page,
  {
    script,
    containerWidth,
    headStyle = "",
  }: { script: string; containerWidth?: number; headStyle?: string },
) {
  const body = (path: string) => ({ body: read(path), contentType: "text/javascript" });
  const files: Record<string, { body: string; contentType: string }> = {
    "/": {
      contentType: "text/html",
      body: `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><style>${headStyle}</style></head>
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
      body: `window.__dist = ${JSON.stringify(distSources())};`,
    },
    "/bootstrap.js": { body: prelude + script, contentType: "text/javascript" },
  };
  await page.route(`${origin}/**`, (route) => {
    const file = files[new URL(route.request().url()).pathname];
    return file ? route.fulfill(file) : route.fulfill({ status: 404 });
  });
  await page.goto(`${origin}/`);
}

export function sixColumnScript(rowCount = 2) {
  return `
const rows = Array.from({ length: ${rowCount} }, (_, index) => ({
  id: "row" + index,
  name: "Deployment " + index,
  scope: index % 2 ? "cairn.write" : "cairn.read",
  state: index % 2 ? "revoked" : "active",
  created: "Jul 10",
  used: index % 2 ? "never" : "Jul 11",
  note: "Best effort",
}));
const columns = [
  { id: "name", header: "Name", minWidth: 160, cardSlot: "title", cell: (row) => row.name },
  {
    id: "scope",
    header: "Scope",
    defaultWidth: 200,
    minWidth: 120,
    cell: (row) => React.createElement(React.Fragment, null,
      React.createElement("strong", null, row.scope),
      React.createElement("small", null, row.note)),
  },
  { id: "state", header: "State", defaultWidth: 90, minWidth: 80, cardSlot: "badge", cell: (row) => row.state },
  { id: "created", header: "Created", defaultWidth: 140, minWidth: 100, priority: "tertiary", cardSlot: "meta", cell: (row) => row.created },
  { id: "used", header: "Last used", defaultWidth: 140, minWidth: 100, priority: "secondary", cardSlot: "meta", cell: (row) => row.used },
  { id: "actions", header: "Actions", defaultWidth: 160, minWidth: 160, cardSlot: "actions", cell: () => React.createElement("button", { type: "button" }, "Revoke") },
];
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(AdminDataTable, { columns, rows, rowKey: (row) => row.id, label: "Keys", storageKey: "keys" }),
);
`;
}
