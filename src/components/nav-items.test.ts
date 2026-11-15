import { describe, it, expect } from "vitest";
import { allNavItems, isActivePath, isAdminRole, primaryMobileHrefs } from "./nav-items";

describe("navigation", () => {
  it("only admins see the Admin entry", () => {
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("SUPERADMIN")).toBe(true);
    expect(allNavItems.find((i) => i.href.startsWith("/admin"))?.adminOnly).toBe(true);
  });

  it("every phone tab exists in the full list, and Groups/Settings are reachable under More", () => {
    const all = allNavItems.map((i) => i.href);
    primaryMobileHrefs.forEach((h) => expect(all).toContain(h));
    const more = allNavItems.filter((i) => !primaryMobileHrefs.includes(i.href)).map((i) => i.label);
    expect(more).toEqual(expect.arrayContaining(["Groups", "Settings", "Money"]));
  });

  it("matches active paths without making Today match everything", () => {
    expect(isActivePath("/tasks/abc", "/tasks")).toBe(true);
    expect(isActivePath("/tasks", "/dashboard")).toBe(false);
    expect(isActivePath("/dashboard", "/dashboard")).toBe(true);
  });
});
