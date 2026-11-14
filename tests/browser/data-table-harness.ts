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

export const mount = (element: string, setup = "") => `
${setup}
ReactDOM.createRoot(document.getElementById("root")).render(${element});
`;

const keysAdapter = `
const keysAdapter = {
  async list() {
    return [
      { id: "key_1", name: "automation-pipeline-production", maskedKey: "ak_1234567890abcdef", scopes: ["catalog.read"], state: "active", createdAt: "2026-07-13T00:00:00.000Z" },
      { id: "key_2", name: "reporting", maskedKey: "ak_abcdef1234567890", scopes: ["reports.read"], state: "active", createdAt: "2026-07-14T00:00:00.000Z" },
      { id: "key_3", name: "retired", maskedKey: "ak_0000000000000000", scopes: ["reports.read"], state: "revoked", createdAt: "2026-07-15T00:00:00.000Z" },
    ];
  },
  async create() { throw new Error("unused"); },
  async revoke() { throw new Error("unused"); },
};`;

export const keysPanel = mount(
  `React.createElement(Kit.ApiKeysPanel, { adapter: keysAdapter, presentation: "responsive", storageKey: "keys" })`,
  keysAdapter,
);

export const usersPanel = mount(
  `React.createElement(Kit.UsersPanel, {
    adapter: usersAdapter,
    search: false,
    renderUserActions: (user) => React.createElement(React.Fragment, null,
      React.createElement("button", { "aria-label": "Edit " + user.label, type: "button" }, "Edit"),
      React.createElement("button", { "aria-label": "Reset password for " + user.label, type: "button" }, "Reset password")),
  })`,
  `const usersAdapter = {
    async list() {
      return { items: [{ id: "usr_1", label: "avery.long.email.address@example.test", role: { value: "owner", label: "Owner" }, status: { value: "active", label: "Active" } }], total: 1, page: 1, pageSize: 25 };
    },
  };`,
);

const editableUsersAdapter = `const usersAdapter = {
  roles: [{ value: "owner", label: "Owner" }, { value: "member", label: "Member" }, { value: "administrator", label: "Administrator" }],
  statuses: [{ value: "active", label: "Active" }, { value: "deactivated", label: "Deactivated" }],
  setRole: { async execute() {} },
  setStatus: { async execute() {} },
  async list() {
    return { items: [
      { id: "usr_1", label: "Avery", secondaryLabel: "avery@example.test", role: { value: "administrator", label: "Administrator" }, status: { value: "deactivated", label: "Deactivated" } },
      { id: "usr_2", label: "Blake", secondaryLabel: "blake.with.a.long.name@example.test", role: { value: "member", label: "Member" }, status: { value: "active", label: "Active" } },
    ], total: 2, page: 1, pageSize: 25 };
  },
};
const deleteAction = (user) => React.createElement("button", { "aria-label": "Delete " + user.label, type: "button" }, "Delete");`;

/** The default User / Role / Status / Actions table with real selects and a Delete action. */
export const usersControlsPanel = mount(
  `React.createElement(Kit.UsersPanel, { adapter: usersAdapter, search: false, renderUserActions: deleteAction })`,
  editableUsersAdapter,
);

/** The custom-column schema a host like Cairn passes: Email is tertiary, Updated secondary, dates are nowrap. */
export const usersCustomColumnsPanel = mount(
  `React.createElement(Kit.UsersPanel, { adapter: usersAdapter, search: false, columns: customColumns })`,
  `${editableUsersAdapter}
const when = "Nov 11, 2026, 2:00 PM";
const select = (key, label, options, setter) => (user, ctx) => React.createElement("select", { "aria-label": label + " for " + user.label, value: user[key].value, onChange: (e) => ctx[setter](e.target.value) },
  options.map((o) => React.createElement("option", { key: o.value, value: o.value }, o.label)));
const customColumns = [
  { id: "account", label: "Account", priority: "primary", render: (user) => React.createElement("div", { className: "admin-kit__user-identity" }, React.createElement("strong", null, user.label), React.createElement("span", null, user.secondaryLabel)) },
  { id: "email", label: "Email", priority: "tertiary", render: (user) => user.secondaryLabel },
  { id: "created", label: "Created", priority: "tertiary", nowrap: true, width: 170, render: () => when },
  { id: "updated", label: "Updated", priority: "secondary", nowrap: true, width: 170, render: () => when },
  { id: "role", label: "Role", width: 176, minWidth: 160, render: select("role", "Role", usersAdapter.roles, "setRole") },
  { id: "status", label: "Status", width: 176, minWidth: 160, render: select("status", "Status", usersAdapter.statuses, "setStatus") },
  { id: "actions", label: "Actions", width: 120, minWidth: 120, render: deleteAction },
];`,
);

export const jobsPanel = mount(
  `React.createElement(Kit.OperationalJobsPanel, { adapter: jobsAdapter, title: "Retention runs" })`,
  `const jobsAdapter = {
    async list() {
      return { items: [{ id: "job_1", label: "Retention policy enforcement for long-running audit exports", detail: "Removes old exports", startedAt: "2024-01-01T15:12:00.000Z", state: "completed" }], page: 1, pageSize: 25, total: 1 };
    },
  };`,
);

/** The audit EventsPanel with its default Occurred column (no `formatTimestamp`), as Cairn mounts it. */
export const eventsPanel = mount(
  `React.createElement(Kit.EventsPanel, { adapter: eventsAdapter, presentation: "table" })`,
  `const eventsAdapter = {
    async list() {
      return { items: [{ id: "evt_1", occurredAt: "2026-05-30T00:59:00.000Z", action: "api_key.created", message: "Created an API key", category: "access", severity: "info", outcome: "success", actor: { id: "usr_1", label: "avery@example.test" }, resource: { id: "key_1", label: "automation-pipeline-production" } }], total: 1, page: 1, pageSize: 25 };
    },
  };`,
);
