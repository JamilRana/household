import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGroup, acceptInvitation, leaveGroup } from "./groups";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

describe("Sharing Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createGroup", () => {
    it("should create a group and make the creator the owner", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      
      await createGroup("Test Group");

      expect(prisma.group.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          name: "Test Group",
          ownerId: "user-1",
          members: expect.objectContaining({
            create: expect.objectContaining({
              userId: "user-1",
              role: "OWNER",
            })
          })
        })
      }));
    });
  });

  describe("acceptInvitation", () => {
    it("should reject if invitation email doesn't match user email", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1", email: "user1@example.com" } });
      
      const mockInvite = {
        id: "inv-1",
        email: "other@example.com",
        status: "PENDING",
        expires: new Date(Date.now() + 100000),
      };

      (prisma.groupInvitation.findUnique as any).mockResolvedValue(mockInvite);

      await expect(acceptInvitation("token-1")).rejects.toThrow("different email address");
    });

    it("should reject if invitation is expired", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1", email: "user1@example.com" } });
      
      const mockInvite = {
        id: "inv-1",
        email: "user1@example.com",
        status: "PENDING",
        expires: new Date(Date.now() - 100000), // Expired
      };

      (prisma.groupInvitation.findUnique as any).mockResolvedValue(mockInvite);

      await expect(acceptInvitation("token-1")).rejects.toThrow("Invalid or expired");
    });
  });
});
