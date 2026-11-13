// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminPanelHeader } from "../react";

describe("collapsible band on the server", () => {
  it("renders without window or localStorage, expanded, with the region visible", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(
      <AdminPanelHeader
        collapsible={{ storageKey: "ssr", collapsedSummary: <span>summary</span> }}
        detail={<p>Detail</p>}
        title="Page"
        toolbar={<input aria-label="Search" />}
      />,
    );
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Hide controls");
    expect(html).not.toMatch(/\shidden[\s=>]/);
    expect(html).not.toContain("summary</span>");
  });
});
