import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateItemStatus, finalizeShoppingSession, moveItemToPantry } from "./groceries";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

describe("Grocery Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.groupMember.findMany as any).mockResolvedValue([]);
    (prisma.groceryItem.findMany as any).mockResolvedValue([]);
    (prisma.groceryItem.update as any).mockResolvedValue({ id: "updated-1", name: "Mock Item" });
  });

  describe("updateItemStatus", () => {
    it("should allow status update if user owns the list", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      
      const mockItem = {
        id: "item-1",
        list: { ownerId: "user-1", groupId: null }
      };

      (prisma.groceryItem.findFirst as any).mockResolvedValue(mockItem);

      await updateItemStatus("item-1", "PURCHASED");

      expect(prisma.groceryItem.update).toHaveBeenCalled();
    });

    it("should throw error if user has no access to the list", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-2" } });
      
      (prisma.groceryItem.findFirst as any).mockResolvedValue(null);

      await expect(updateItemStatus("item-1", "PURCHASED")).rejects.toThrow("access denied");
    });
  });

  describe("finalizeShoppingSession", () => {
    it("should create a consolidated transaction and mark items as purchased", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      
      // Mock active group
      vi.mock("./user", () => ({
        getActiveGroupId: vi.fn().mockResolvedValue("group-1")
      }));

      // Mock category lookup and creation
      (prisma.category.findFirst as any).mockResolvedValue(null);
      (prisma.category.create as any).mockResolvedValue({ id: "cat-1", name: "Groceries" });

      await finalizeShoppingSession({}, 150.75);

      expect(prisma.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          amount: 150.75,
          description: expect.stringContaining("Shopping trip"),
        })
      }));
    });
  });
});
