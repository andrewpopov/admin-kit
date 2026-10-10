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
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
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
  AdminApp,
  AdminAppShell,
  AdminCard,
  ApiKeysPanel,
  UsersPanel,
  LogsPanel,
  EventsPanel,
  AdminMobileCellLabel,
  AdminPanelStateView,
  OperationalJobsPanel,
  AdminTheme,
  AdminDialog,
  AdminConfirmationDialog,
  AdminField,
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

const apiKeysAdapter = {
  async list() {
    return [
      {
        id: "key_1",
        name: "automation-for-the-long-running-catalog-reconciliation-and-import-pipeline-production",
        maskedKey: "ak_1234567890abcdef",
        scopes: ["/api/catalog/reconciliation/long-running-imports-and-automations"],
        state: "active",
        createdAt: "2026-07-13T00:00:00.000Z",
      },
    ];
  },
  async create() {
    throw new Error("Not exercised by the browser fixture");
  },
  async revoke() {
    throw new Error("Not exercised by the browser fixture");
  },
};

const eventsAdapter = {
  async list() {
    return {
      items: [
        {
          id: "evt_1",
          occurredAt: "2024-01-01T15:12:00.000Z",
          category: "assistant",
          action: "assistant.task.completed",
          message: "Assistant task finished after a long-running catalog reconciliation",
          severity: "info",
          outcome: "success",
          metadata: { task: "task-0123456789abcdef" },
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    };
  },
};

// A realistic 3-group, 15-item rail of single-line links so the desktop density assertion is meaningful.
const fillerSections = (prefix, count) => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  label: `${prefix} section ${index + 1}`,
  capability: `custom:${prefix}-${index + 1}`,
  render: () => null,
}));

const jobsAdapter = {
  async list() {
    return {
      items: [
        {
          id: "job_1",
          label: "Retention policy enforcement for long-running audit exports",
          detail: "Removes exports older than the configured retention window",
          startedAt: "2024-01-01T15:12:00.000Z",
          state: "completed",
        },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    };
  },
};

const tree = React.createElement(
  React.Fragment,
  null,
  React.createElement(AdminApp, {
    frame: {
      title: "Admin console",
      actions: React.createElement("span", null, "Signed in as admin@example.test"),
    },
    activeSection: "users",
    onSectionChange: () => undefined,
    groups: [{
      id: "administration",
      label: "Administration",
      sections: [{
        id: "users",
        label: "Users",
        capability: "users",
        description: "Account access and lifecycle",
        render: () => React.createElement(
          AdminWorkspace,
          {
            title: "Users",
            description: "Manage account roles and lifecycle.",
            actions: React.createElement(
              React.Fragment,
              null,
              React.createElement(AdminActionButton, { tone: "primary" }, "Invite user"),
              React.createElement(AdminActionButton, null, "Export"),
              React.createElement(AdminActionButton, { tone: "primary", disabled: true }, "Archive all"),
            ),
          },
          // Keeps the routed content taller than the 15-item rail so the rail's
          // intrinsic (unstretched) height stays observable.
          React.createElement("div", { style: { minHeight: "1400px" } }, React.createElement(UsersPanel, {
            adapter: usersAdapter,
            search: false,
            renderUserActions: (user) => React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "button",
                { "aria-label": `Edit ${user.label}`, type: "button" },
                "Edit",
              ),
              React.createElement(
                "button",
                { "aria-label": `Reset password for ${user.label}`, type: "button" },
                "Reset password",
              ),
            ),
          })),
        ),
      }, ...fillerSections("admin", 4)],
    }, {
      id: "operations",
      label: "Operations",
      sections: fillerSections("ops", 5),
    }, {
      id: "security",
      label: "Security",
      sections: fillerSections("sec", 5),
    }],
  }),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "Runtime logs", description: "Inspect bounded output from the selected process." },
    React.createElement(LogsPanel, { adapter: logsAdapter, title: "Server logs" }),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "Events", description: "Audit trail stays readable on phones." },
    React.createElement(EventsPanel, {
      adapter: eventsAdapter,
      columns: ["occurred", "event", "outcome"],
      headerPresentation: "section",
      presentation: "table",
    }),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "Stacked table", description: "Consumer-built table using the stack modifier." },
    React.createElement(
      "div",
      { className: "admin-kit__table-wrap admin-kit__table-wrap--stack", "data-testid": "stack-table-wrap" },
      React.createElement(
        "table",
        { className: "admin-kit__table admin-kit__table--stack" },
        React.createElement("thead", null, React.createElement("tr", null,
          React.createElement("th", { scope: "col" }, "Name"),
          React.createElement("th", { scope: "col" }, "Cuisine"),
          React.createElement("th", { scope: "col" }, "Notes"),
        )),
        React.createElement("tbody", null, React.createElement("tr", null,
          React.createElement("th", { scope: "row" }, React.createElement(AdminMobileCellLabel, null, "Name"), "Restaurant with a very long name that would normally force sideways scrolling"),
          React.createElement("td", null, React.createElement(AdminMobileCellLabel, null, "Cuisine"), "Neapolitan"),
          React.createElement("td", null, React.createElement(AdminMobileCellLabel, null, "Notes"), "Reservation-required-weekends-only-and-bring-cash-for-the-coat-check"),
        )),
      ),
    ),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "Operational jobs", description: "Jobs stack into cards on phones." },
    React.createElement(OperationalJobsPanel, { adapter: jobsAdapter, title: "Retention runs" }),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "Loading skeleton", description: "Placeholder bars while a panel loads." },
    React.createElement(AdminPanelStateView, {
      state: { kind: "loading", label: "Loading users…", skeletonRows: 3 },
      className: "skeleton-fixture",
    }),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "API keys", description: "Long credential metadata stays inside the viewport." },
    React.createElement(ApiKeysPanel, { adapter: apiKeysAdapter, headerPresentation: "section", presentation: "table" }),
  ),
  React.createElement(
    AdminWorkspace,
    { as: "section", title: "API key cards", description: "Compact credential review at narrow widths." },
    React.createElement(ApiKeysPanel, { adapter: apiKeysAdapter, headerPresentation: "section", presentation: "cards" }),
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
await act(async () => {
  root.unmount();
});

const page = (title, body, head = "") => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="../../dist/styles.css" />
    ${head}
    <title>${title}</title>
  </head>
  <body>
    ${body}
  </body>
</html>
`;

writeFileSync(fixturePath, page("Admin Kit browser fixture", bodyHtml));
console.log(`[render-browser-fixture] wrote ${fixturePath} (${bodyHtml.length} bytes of rendered markup)`);

// Dialogs portal to document.body once mounted, which is the layout the
// browser tests need to see. Render each in jsdom (effects flushed), then
// serialize the host tree plus whatever was portaled beside it.
async function renderPortaledPage(fileName, title, dialog, head) {
  const host = document.createElement("div");
  document.body.append(host);
  const pageRoot = createRoot(host);
  await act(async () => {
    pageRoot.render(
      React.createElement(
        AdminTheme,
        null,
        React.createElement("p", null, "Host page content behind the dialog."),
        dialog,
      ),
    );
  });
  const portaled = Array.from(document.body.children).filter((node) => node !== host && node !== container);
  const html = host.innerHTML + portaled.map((node) => node.outerHTML).join("");
  await act(async () => {
    pageRoot.unmount();
  });
  host.remove();
  const file = resolve(packageRoot, "tests/browser", fileName);
  writeFileSync(file, page(title, html, head));
  console.log(`[render-browser-fixture] wrote ${file} (${html.length} bytes of rendered markup)`);
}

// A host rebrand as documented in the README: a compound selector on the theme wrapper.
const hostRebrand = "<style>.admin-kit.admin-kit--theme-core { --admin-kit-accent: #6b5b45; }</style>";

await renderPortaledPage(
  "admin-dialog.html",
  "Admin Kit dialog fixture",
  React.createElement(
    AdminDialog,
    {
      open: true,
      title: "Invite teammates",
      description: "Each teammate gets a one-time setup link.",
      onClose: () => undefined,
      actions: React.createElement(
        React.Fragment,
        null,
        React.createElement("button", { type: "button" }, "Cancel"),
        React.createElement("button", { type: "button" }, "Send invites"),
      ),
    },
    Array.from({ length: 24 }, (_, index) =>
      React.createElement(
        AdminField,
        { key: index, label: `Teammate ${index + 1} email` },
        React.createElement("input", { type: "email" }),
      ),
    ),
  ),
  hostRebrand,
);

await renderPortaledPage(
  "admin-confirmation-dialog.html",
  "Admin Kit confirmation dialog fixture",
  React.createElement(AdminConfirmationDialog, {
    open: true,
    title: "Revoke key?",
    description: "Anything using this key stops working immediately.",
    confirmLabel: "Revoke key",
    onCancel: () => undefined,
    onConfirm: () => undefined,
  }),
  hostRebrand,
);

// A deliberately short page inside both frames (AdminApp and AdminAppShell), with a host
// background that differs from the frame surface, so a frame that stops short of the
// viewport shows the host colour as a band below it.
const shortHead = "<style>html, body { background: rgb(255, 0, 255); margin: 0; }</style>";
const shortSection = {
  id: "overview",
  label: "Overview",
  capability: "custom:overview",
  render: () => React.createElement(
    AdminWorkspace,
    { title: "Overview", description: "A short page." },
    React.createElement(AdminCard, { title: "Status" }, "All systems normal."),
  ),
};
await renderShortPage(
  "admin-app-short.html",
  "Admin Kit short AdminApp fixture",
  React.createElement(AdminApp, {
    frame: { title: "Admin console", actions: React.createElement("span", null, "Signed in") },
    activeSection: "overview",
    onSectionChange: () => undefined,
    groups: [{
      id: "main",
      label: "Main",
      sections: [shortSection, { ...shortSection, id: "other", label: "Other", capability: "custom:other" }],
    }],
  }),
);
// One visible section: the kit omits the navigation rail and the phone Menu toggle.
await renderShortPage(
  "admin-app-single-short.html",
  "Admin Kit single-section AdminApp fixture",
  React.createElement(AdminApp, {
    frame: { title: "Admin console", actions: React.createElement("span", null, "Signed in") },
    activeSection: "overview",
    onSectionChange: () => undefined,
    groups: [{ id: "main", label: "Main", sections: [shortSection] }],
  }),
);
await renderShortPage(
  "admin-app-shell-short.html",
  "Admin Kit short AdminAppShell fixture",
  React.createElement(AdminAppShell, {
    frame: { title: "Admin console", actions: React.createElement("span", null, "Signed in") },
    renderNavigation: () => React.createElement("a", { href: "#overview" }, "Overview"),
  }, shortSection.render()),
);

async function renderShortPage(fileName, title, tree) {
  const host = document.createElement("div");
  document.body.append(host);
  const shortRoot = createRoot(host);
  await act(async () => {
    shortRoot.render(tree);
  });
  const html = host.innerHTML;
  await act(async () => {
    shortRoot.unmount();
  });
  host.remove();
  const file = resolve(packageRoot, "tests/browser", fileName);
  writeFileSync(file, page(title, html, shortHead));
  console.log(`[render-browser-fixture] wrote ${file} (${html.length} bytes of rendered markup)`);
}
