import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { NO_GROUP, mine } from "./scope";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("tenant scoping helpers", () => {
  it("mine() with no group only matches the user's own rows", () => {
    expect(mine("u1", null)).toEqual({ userId: "u1" });
    expect(mine("u1", undefined, "ownerId")).toEqual({ ownerId: "u1" });
  });

  it("mine() with a group matches own rows OR that group", () => {
    expect(mine("u1", "g1")).toEqual({ OR: [{ userId: "u1" }, { groupId: "g1" }] });
  });

  it("NO_GROUP is a concrete string, never undefined (undefined would match every row)", () => {
    expect(typeof NO_GROUP).toBe("string");
    expect(NO_GROUP.length).toBeGreaterThan(0);
  });

  it("REGRESSION GUARD: no source file may use `groupId || undefined` in a Prisma filter", () => {
    const root = join(__dirname, "..");
    const offenders = walk(root)
      .filter((f) => !f.endsWith(".test.ts") && !f.endsWith("scope.ts"))
      .filter((f) => /groupId\s*\|\|\s*undefined/i.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
