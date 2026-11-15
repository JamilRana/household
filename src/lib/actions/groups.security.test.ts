import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateMemberRole, removeMember, addMemberByUserId } from "./groups";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const as = (role: string) =>
  (prisma.groupMember.findUnique as any).mockResolvedValue({ userId: "caller", groupId: "g1", role });

describe("group management authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "caller" } });
  });

  it("rejects a member id that belongs to a DIFFERENT group (cross-group IDOR)", async () => {
    as("ADMIN");
    (prisma.groupMember.findFirst as any).mockResolvedValue(null); // lookup is scoped by groupId
    await expect(updateMemberRole("g1", "member-of-other-group", "GUEST")).rejects.toThrow("not found");
    expect(prisma.groupMember.findFirst).toHaveBeenCalledWith({ where: { id: "member-of-other-group", groupId: "g1" } });
    expect(prisma.groupMember.update).not.toHaveBeenCalled();
  });

  it("never lets anyone change or remove the OWNER", async () => {
    as("ADMIN");
    (prisma.groupMember.findFirst as any).mockResolvedValue({ id: "m1", userId: "owner", role: "OWNER" });
    await expect(updateMemberRole("g1", "m1", "MEMBER")).rejects.toThrow(/owner/i);
    await expect(removeMember("g1", "m1")).rejects.toThrow(/owner/i);
  });

  it("only the OWNER may promote to ADMIN", async () => {
    as("ADMIN");
    (prisma.groupMember.findFirst as any).mockResolvedValue({ id: "m2", userId: "bob", role: "MEMBER" });
    await expect(updateMemberRole("g1", "m2", "ADMIN")).rejects.toThrow(/owner/i);
  });

  it("an owner can promote a member to ADMIN", async () => {
    as("OWNER");
    (prisma.groupMember.findFirst as any).mockResolvedValue({ id: "m2", userId: "bob", role: "MEMBER" });
    await updateMemberRole("g1", "m2", "ADMIN");
    expect(prisma.groupMember.update).toHaveBeenCalledWith({ where: { id: "m2" }, data: { role: "ADMIN" } });
  });

  it("a plain MEMBER cannot manage anyone", async () => {
    as("MEMBER");
    await expect(removeMember("g1", "m2")).rejects.toThrow("Insufficient permissions");
    await expect(addMemberByUserId("g1", "u9")).rejects.toThrow("Insufficient permissions");
  });

  it("an admin cannot add another ADMIN", async () => {
    as("ADMIN");
    await expect(addMemberByUserId("g1", "u9", "ADMIN")).rejects.toThrow(/owner/i);
  });
});
