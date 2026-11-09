import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireGroupAccess } from "./permissions";
import { prisma } from "@/lib/db";

describe("Permissions Matrix - requireGroupAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Owner Access", () => {
    it("should grant access if user is direct owner of the resource", async () => {
      (prisma.taskList.findUnique as any).mockResolvedValue({
        id: "list-1",
        ownerId: "user-owner",
        groupId: "group-1",
        shares: [],
      });

      const result = await requireGroupAccess("TASK_LIST", "list-1", "user-owner", "OWNER");
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe("OWNER");
    });
  });

  describe("Group Role Hierarchy", () => {
    it("should grant access to an ADMIN when MEMBER is required", async () => {
      (prisma.pantryItem.findUnique as any).mockResolvedValue({
        id: "pantry-1",
        userId: "other-user",
        groupId: "group-1",
      });

      (prisma.groupMember.findUnique as any).mockResolvedValue({
        userId: "user-admin",
        groupId: "group-1",
        role: "ADMIN",
      });

      const result = await requireGroupAccess("PANTRY_ITEM", "pantry-1", "user-admin", "MEMBER");
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe("ADMIN");
    });

    it("should reject a GUEST when MEMBER is required", async () => {
      (prisma.groceryList.findUnique as any).mockResolvedValue({
        id: "groc-1",
        ownerId: "other-user",
        groupId: "group-1",
        shares: [],
      });

      (prisma.groupMember.findUnique as any).mockResolvedValue({
        userId: "user-guest",
        groupId: "group-1",
        role: "GUEST",
      });

      await expect(
        requireGroupAccess("GROCERY_LIST", "groc-1", "user-guest", "MEMBER")
      ).rejects.toThrow("Requires minimum role of MEMBER, but your role is GUEST");
    });

    it("should allow a GUEST when GUEST is required", async () => {
      (prisma.groceryList.findUnique as any).mockResolvedValue({
        id: "groc-1",
        ownerId: "other-user",
        groupId: "group-1",
        shares: [],
      });

      (prisma.groupMember.findUnique as any).mockResolvedValue({
        userId: "user-guest",
        groupId: "group-1",
        role: "GUEST",
      });

      const result = await requireGroupAccess("GROCERY_LIST", "groc-1", "user-guest", "GUEST");
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe("GUEST");
    });
  });

  describe("Unauthorized Non-Members", () => {
    it("should reject a user who has no membership in the group", async () => {
      (prisma.task.findUnique as any).mockResolvedValue({
        id: "task-1",
        createdBy: "creator-user",
        list: {
          id: "list-1",
          ownerId: "creator-user",
          groupId: "group-1",
          shares: [],
        },
        assignments: [],
      });

      (prisma.groupMember.findUnique as any).mockResolvedValue(null);

      await expect(
        requireGroupAccess("TASK", "task-1", "stranger-user", "GUEST")
      ).rejects.toThrow("Access denied: You do not have permission to access this TASK");
    });
  });

  describe("Direct Shares", () => {
    it("should grant access if task list is directly shared with EDITOR role", async () => {
      (prisma.taskList.findUnique as any).mockResolvedValue({
        id: "list-shared",
        ownerId: "owner-user",
        groupId: null,
        shares: [{ role: "EDITOR" }],
      });

      const result = await requireGroupAccess("TASK_LIST", "list-shared", "shared-user", "MEMBER");
      expect(result.hasAccess).toBe(true);
      expect(result.role).toBe("EDITOR");
    });
  });
});
