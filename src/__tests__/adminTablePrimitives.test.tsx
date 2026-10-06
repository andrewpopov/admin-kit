// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminMobileCellLabel } from "../react";

afterEach(cleanup);

describe("AdminMobileCellLabel", () => {
  it("is hidden from assistive tech because the thead already names the column", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <th scope="col">Cuisine</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <AdminMobileCellLabel>Cuisine</AdminMobileCellLabel>
              Neapolitan
            </td>
          </tr>
        </tbody>
      </table>,
    );
    const label = container.querySelector(".admin-kit__mobile-cell-label");
    expect(label?.getAttribute("aria-hidden")).toBe("true");
    expect(label?.textContent).toBe("Cuisine");
    expect(screen.getAllByText("Cuisine")).toHaveLength(2);
    expect(screen.getAllByRole("columnheader", { name: "Cuisine" })).toHaveLength(1);
    expect(screen.queryByRole("cell", { name: "Cuisine Neapolitan" })).toBeNull();
    expect(screen.getByRole("cell", { name: "Neapolitan" })).toBeTruthy();
  });
});
