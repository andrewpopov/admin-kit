import { describe, expect, it } from "vitest";
import {
  defineAdminConsole,
  defineAdminUsersAdapter,
  normalizeAdminFailure,
  type AdminUserSummary,
} from "../core";
import { createAdminPageFixture } from "../testing";

describe("defineAdminConsole", () => {
  it("freezes valid, uniquely named section metadata", () => {
    const consoleDefinition = defineAdminConsole({
      sections: [
        { id: "users", label: "Users" },
        { id: "flags", label: "Feature flags" },
      ],
    });

    expect(consoleDefinition.sections.map((section) => section.id)).toEqual([
      "users",
      "flags",
    ]);
    expect(Object.isFrozen(consoleDefinition.sections)).toBe(true);
  });

  it.each([
    [{ sections: [] }, /at least one/i],
    [
      {
        sections: [
          { id: "users", label: "Users" },
          { id: "users", label: "More users" },
        ],
      },
      /duplicate/i,
    ],
    [{ sections: [{ id: " ", label: "Users" }] }, /must not be empty/i],
    [{ sections: [{ id: "users", label: " " }] }, /needs a label/i],
  ])("rejects invalid configuration", (definition, message) => {
    expect(() => defineAdminConsole(definition)).toThrow(message);
  });
});

describe("defineAdminUsersAdapter", () => {
  it("models Savoro and Sano user differences without a shared database user type", async () => {
    const savoro = defineAdminUsersAdapter<AdminUserSummary>({
      list: async () => ({
        items: [
          {
            id: "u1",
            label: "owner",
            role: { value: "owner", label: "Owner" },
            status: { value: "active", label: "Active" },
          },
        ],
        page: 1,
        pageSize: 25,
        total: 1,
      }),
      roles: [
        { value: "owner", label: "Owner" },
        { value: "member", label: "Member" },
      ],
      statuses: [
        { value: "active", label: "Active" },
        { value: "deactivated", label: "Deactivated", tone: "danger" },
      ],
      setStatus: {
        execute: async ({ userId, status }) => ({
          id: userId,
          label: "owner",
          status: { value: status, label: status },
        }),
      },
      delete: {
        execute: async ({
          userId,
          confirmToken,
        }: {
          userId: string;
          confirmToken: string;
        }) => undefined,
      },
    });
    const sano = defineAdminUsersAdapter<AdminUserSummary>({
      list: async () => ({
        items: [
          {
            id: "u2",
            label: "ada@example.com",
            secondaryLabel: "Ada",
            role: { value: "admin", label: "Admin" },
            status: { value: "disabled", label: "Disabled" },
          },
        ],
        page: 1,
        pageSize: 25,
        total: 1,
      }),
      roles: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
      setRole: {
        execute: async ({ userId, role }) => ({
          id: userId,
          label: "ada@example.com",
          role: { value: role, label: role },
        }),
      },
      resetCredentials: { execute: async () => undefined },
      delete: { execute: async ({ userId }) => undefined },
    });

    expect(
      (await savoro.list({ page: 1, pageSize: 25 })).items[0]?.status?.value,
    ).toBe("active");
    expect(
      (await sano.list({ page: 1, pageSize: 25 })).items[0]?.secondaryLabel,
    ).toBe("Ada");
    expect(savoro.invite).toBeUndefined();
    expect(sano.statuses).toBeUndefined();
  });

  it.each([
    [
      { roles: [{ value: " ", label: "Owner" }] },
      /role values must not be empty/i,
    ],
    [
      { statuses: [{ value: "active", label: " " }] },
      /status value active needs a label/i,
    ],
    [
      {
        roles: [
          { value: "owner", label: "Owner" },
          { value: "owner", label: "Owner again" },
        ],
      },
      /duplicate role/i,
    ],
  ])("rejects ambiguous declared options", (options, message) => {
    expect(() =>
      defineAdminUsersAdapter({
        list: async () => ({ items: [], page: 1, pageSize: 25, total: 0 }),
        ...options,
      }),
    ).toThrow(message);
  });
});

describe("admin adapter helpers", () => {
  it("preserves an error message without coupling to an HTTP response type", () => {
    expect(normalizeAdminFailure(new Error("Network unavailable"))).toEqual({
      message: "Network unavailable",
      retryable: true,
    });
  });

  it("creates immutable consumer-shaped page data", () => {
    const page = createAdminPageFixture(
      [{ id: "first" }, { id: "second" }],
      2,
      25,
    );
    expect(page).toMatchObject({ page: 2, pageSize: 25, total: 2 });
    expect(Object.isFrozen(page.items)).toBe(true);
  });
});
