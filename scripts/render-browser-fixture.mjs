#!/usr/bin/env node
// Renders the real Admin Kit components (from `dist/`, i.e. what a consumer
// actually installs) into `tests/browser/admin-shell.html`, so the browser
// fixture tracks component/CSS structure instead of a hand-maintained
// markup replica that can silently drift from the source components.
//
// UsersPanel/LogsPanel are adapter-backed and populate themselves inside
// `useEffect`, which `react-dom/server` never runs. To get genuinely
// rendered (not hand-copied) markup we mount them into a real jsdom
// document with `react-dom/client`, flush effects with `act`, and then
// serialize the resulting DOM.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

const packageRoot = resolve(new URL("..", import.meta.url).pathname);
const fixturePath = resolve(packageRoot, "tests/browser/admin-shell.html");

const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
  url: "http://localhost/",
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.customElements = dom.window.customElements;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import("react");
const { act } = React;
const { createRoot } = await import("react-dom/client");
const {
  AdminWorkspace,
  AdminActionButton,
  UsersPanel,
  LogsPanel,
} = await import(resolve(packageRoot, "dist/index.js"));

const usersAdapter = {
  async list() {
    return {
      items: [
        {
          id: "usr_1",
          label: "avery.long.email.address@example.test",
          role: { value: "owner", label: "Owner" },
          status: { value: "active", label: "Active" },
        },
      ],
      total: 1,
      page: 1,
      pageSize: 25,
    };
  },
};

const logsAdapter = {
  async read() {
    return {
      source: "api.log",
      sources: [
        { value: "api.log", label: "api.log" },
        { value: "web.log", label: "web.log" },
      ],
      total: 2,
      entries: [
        {
          id: "log_1",
          message: "request.completed correlation_id=01JZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ",
          timestamp: "2024-01-01T15:12:00.000Z",
          level: { value: "info", label: "INFO", tone: "info" },
          category: "http",
        },
        {
          id: "log_2",
          message: "worker.failed reason=connection-timeout",
          timestamp: "2024-01-01T15:13:00.000Z",
          level: { value: "error", label: "ERROR", tone: "danger" },
          category: "worker",
        },
      ],
    };
  },
};

const tree = React.createElement(
  React.Fragment,
  null,
  React.createElement(
    AdminWorkspace,
    {
      title: "Users",
      description: "Manage account roles and lifecycle.",
      actions: React.createElement(
        React.Fragment,
        null,
        React.createElement(AdminActionButton, { tone: "primary" }, "Invite user"),
        React.createElement(AdminActionButton, null, "Export"),
      ),
    },
    React.createElement(UsersPanel, { adapter: usersAdapter, search: false }),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "Runtime logs", description: "Inspect bounded output from the selected process." },
    React.createElement(LogsPanel, { adapter: logsAdapter, title: "Server logs" }),
  ),
);

const container = document.getElementById("root");
const root = createRoot(container);
// A single `act` scope spanning both the initial mount and the effect-driven
// reload: the panels' `useEffect` kicks off an async adapter call, and its
// resolution (a further state update) must land inside the same act flush
// to avoid a "not wrapped in act" warning and to guarantee the DOM we
// serialize below reflects the fully loaded panels, not the loading state.
await act(async () => {
  root.render(tree);
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
});

const bodyHtml = container.innerHTML;
root.unmount();

const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="../../dist/styles.css" />
    <title>Admin Kit browser fixture</title>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>
`;

writeFileSync(fixturePath, template);
console.log(`[render-browser-fixture] wrote ${fixturePath} (${bodyHtml.length} bytes of rendered markup)`);
