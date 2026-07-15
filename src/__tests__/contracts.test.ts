import { describe, expect, it } from "vitest";
import {
  defineAdminApp,
  defineAdminConsole,
  defineAdminPortal,
  validateAdminApiKeyCreated,
  defineAdminUsersAdapter,
  defineAdminMembershipsAdapter,
  normalizeAdminFailure,
  validateAdminMemberships,
  validateAdminFeatureFlagsSnapshot,
  type AdminFeatureFlagsSnapshot,
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

describe("defineAdminPortal", () => {
  it("freezes grouped metadata while preserving host-computed visibility", () => {
    const portal = defineAdminPortal({
      groups: [
        {
          id: "core",
          label: "Core administration",
          sections: [
            { id: "users", label: "Users" },
            { id: "security", label: "Security", visible: false },
          ],
        },
      ],
    });

    expect(portal.groups[0]?.sections[1]?.visible).toBe(false);
    expect(Object.isFrozen(portal.groups)).toBe(true);
    expect(Object.isFrozen(portal.groups[0]?.sections)).toBe(true);
  });

  it.each([
    [{ groups: [] }, /at least one section group/i],
    [
      { groups: [{ id: "core", label: "Core", sections: [] }] },
      /needs at least one section/i,
    ],
    [
      {
        groups: [
          { id: "core", label: "Core", sections: [{ id: "users", label: "Users" }] },
          { id: "core", label: "More", sections: [{ id: "flags", label: "Flags" }] },
        ],
      },
      /duplicate admin section group/i,
    ],
    [
      {
        groups: [
          { id: "core", label: "Core", sections: [{ id: "users", label: "Users" }] },
          { id: "app", label: "Application", sections: [{ id: "users", label: "Users again" }] },
        ],
      },
      /duplicate admin section id/i,
    ],
  ])("rejects ambiguous grouped navigation", (definition, message) => {
    expect(() => defineAdminPortal(definition)).toThrow(message);
  });
});

describe("defineAdminApp", () => {
  it("freezes the canonical capability registry", () => {
    const app = defineAdminApp({
      groups: [{
        id: "core",
        label: "Core administration",
        sections: [
          { id: "users", label: "Users", capability: "users" },
          { id: "catalog", label: "Catalog", capability: "custom:catalog" },
        ],
      }],
    });

    expect(app.groups[0]?.sections[0]?.capability).toBe("users");
    expect(app.groups[0]?.sections[1]?.capability).toBe("custom:catalog");
    expect(Object.isFrozen(app.groups[0]?.sections[0])).toBe(true);
  });

  it.each([
    [{ groups: [{ id: "core", label: "Core", sections: [{ id: "users", label: "Users", capability: "unknown" }] }] }, /unknown admin capability/i],
    [{ groups: [{ id: "core", label: "Core", sections: [{ id: "catalog", label: "Catalog", capability: "custom: " }] }] }, /unknown admin capability/i],
    [{ groups: [{ id: "core", label: "Core", sections: [{ id: "users", label: "Users", capability: "users" }, { id: "people", label: "People", capability: "users" }] }] }, /duplicate admin capability/i],
  ])("rejects an invalid capability registry", (definition, message) => {
    expect(() => defineAdminApp(definition as never)).toThrow(message);
  });
});

describe("feature flag snapshots", () => {
  it("keeps Sano store flags and Bewks-style fallback flags distinct", () => {
    const sano = validateAdminFeatureFlagsSnapshot({
      storeHealth: "healthy",
      flags: [
        {
          key: "allow_signups",
          label: "Allow signups",
          enabled: true,
          source: "store",
          mutable: true,
        },
      ],
    });
    const bewksFallback = validateAdminFeatureFlagsSnapshot({
      storeHealth: "unavailable",
      storeHealthDetail:
        "Settings database is unavailable; defaults are active.",
      flags: [
        {
          key: "new_user_registration",
          label: "New user registration",
          enabled: true,
          source: "store-error-policy",
          mutable: false,
        },
      ],
    });

    expect(sano.flags[0]?.mutable).toBe(true);
    expect(bewksFallback.flags[0]?.source).toBe("store-error-policy");
  });

  const misleadingSnapshots: readonly [AdminFeatureFlagsSnapshot, RegExp][] = [
    [
      {
        storeHealth: "healthy",
        flags: [
          {
            key: "a",
            label: "A",
            enabled: true,
            source: "environment",
            mutable: true,
          },
        ],
      },
      /cannot be mutable/i,
    ],
    [
      { storeHealth: "healthy", storeHealthDetail: "nope", flags: [] },
      /must not report/i,
    ],
  ];

  it.each(misleadingSnapshots)(
    "rejects a misleading effective-state presentation",
    (snapshot, message) => {
      expect(() => validateAdminFeatureFlagsSnapshot(snapshot)).toThrow(
        message,
      );
    },
  );
});

describe("defineAdminUsersAdapter", () => {
  it("models Bewks invitations and Savoro account facts without a shared database user type", async () => {
    const savoro = defineAdminUsersAdapter<AdminUserSummary>({
      list: async () => ({
        items: [
          {
            id: "u1",
            label: "owner@example.test",
            role: { value: "owner", label: "Owner" },
            status: { value: "active", label: "Active" },
            details: [{ label: "Last login", value: "Never" }],
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
    const bewks = defineAdminUsersAdapter<AdminUserSummary, never, { email: string; role: string }>({
      list: async () => ({
        items: [
          {
            id: "u2",
            label: "ada@example.com",
            secondaryLabel: "Ada",
            role: { value: "member", label: "Member" },
            status: { value: "disabled", label: "Disabled" },
            details: [{ label: "Invited", value: "Jul 13, 2026" }],
          },
        ],
        page: 1,
        pageSize: 25,
        total: 1,
      }),
      roles: [
        { value: "member", label: "Member" },
        { value: "guest", label: "Guest" },
      ],
      setRole: {
        execute: async ({ userId, role }) => ({
          id: userId,
          label: "ada@example.com",
          role: { value: role, label: role },
        }),
      },
      resetCredentials: { execute: async () => undefined },
      invite: { execute: async () => ({ id: "u3", label: "new@example.test" }) },
    });

    expect(
      (await savoro.list({ page: 1, pageSize: 25 })).items[0]?.status?.value,
    ).toBe("active");
    expect(
      (await bewks.list({ page: 1, pageSize: 25 })).items[0]?.secondaryLabel,
    ).toBe("Ada");
    expect((await savoro.list({ page: 1, pageSize: 25 })).items[0]?.details?.[0]?.value).toBe("Never");
    expect(bewks.invite).toBeDefined();
    expect(bewks.statuses).toBeUndefined();
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

describe("scoped membership adapters", () => {
  it("models Mizen workspace and Cairn project roles without a shared tenant schema", async () => {
    const mizen = defineAdminMembershipsAdapter({
      scope: { id: "workspace-1", label: "Product", kind: "workspace" },
      roles: [
        { value: "OWNER", label: "Owner" },
        { value: "ADMIN", label: "Administrator" },
        { value: "MEMBER", label: "Member" },
        { value: "GUEST", label: "Guest" },
      ],
      list: async () => [{
        memberId: "mizen-user-1", label: "Ada", secondaryLabel: "ada@example.test",
        role: "ADMIN", source: "explicit", mutable: true,
      }],
      invite: { execute: async ({ email, role }: { email: string; role: string }) => undefined },
      setRole: { execute: async () => undefined },
      remove: { execute: async () => undefined },
    });
    const cairn = defineAdminMembershipsAdapter({
      scope: { id: "BRAIN", label: "Agent Brain", kind: "project" },
      roles: [
        { value: "OWNER", label: "Owner" },
        { value: "ADMIN", label: "Administrator" },
        { value: "MEMBER", label: "Member" },
        { value: "VIEWER", label: "Viewer" },
      ],
      list: async () => [{
        memberId: "cairn-user-1", label: "Ada", role: "MEMBER",
        source: "inherited", mutable: false,
      }],
      setRole: { execute: async () => undefined },
    });

    expect(validateAdminMemberships(await mizen.list(), mizen.roles)[0]?.role).toBe("ADMIN");
    expect(validateAdminMemberships(await cairn.list(), cairn.roles)[0]?.source).toBe("inherited");
    expect(mizen.scope.kind).toBe("workspace");
    expect(cairn.scope.kind).toBe("project");
  });

  it("rejects undeclared roles and mutable inherited memberships", () => {
    const roles = [{ value: "MEMBER", label: "Member" }];
    expect(() => validateAdminMemberships([{
      memberId: "u1", label: "Ada", role: "OWNER", source: "explicit", mutable: true,
    }], roles)).toThrow(/undeclared role/i);
    expect(() => validateAdminMemberships([{
      memberId: "u1", label: "Ada", role: "MEMBER", source: "inherited", mutable: true,
    }], roles)).toThrow(/cannot be mutable/i);
    expect(() => validateAdminMemberships([{
      memberId: "u1", label: "Ada", role: "MEMBER", source: "inherited", mutable: false,
      permissions: { canRemove: true },
    }], roles)).toThrow(/cannot expose mutations/i);
  });
});

describe("API-key secret boundary", () => {
  it("accepts a secret only on a validated create or rotate response", () => {
    const created = validateAdminApiKeyCreated({
      key: {
        id: "key-1",
        name: "Automation",
        maskedKey: "ak_…1234",
        state: "active",
        scopes: ["read"],
        createdAt: "2026-07-13T00:00:00.000Z",
      },
      secret: "ak_live_once",
    });

    expect(created.secret).toBe("ak_live_once");
    expect(Object.isFrozen(created)).toBe(true);
  });

  it("rejects empty one-time secrets before a panel can reveal them", () => {
    expect(() =>
      validateAdminApiKeyCreated({
        key: {
          id: "key-1",
          name: "Automation",
          maskedKey: "ak_…1234",
          state: "active",
          scopes: [],
          createdAt: "2026-07-13T00:00:00.000Z",
        },
        secret: " ",
      }),
    ).toThrow(/one-time secret/i);
  });
});
