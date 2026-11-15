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

  describe("updateItemStatus idempotency", () => {
    it("does not create pantry/expense rows again for an already purchased item", async () => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      (prisma.groceryItem.findFirst as any).mockResolvedValue({
        id: "item-1", status: "PURCHASED", purchasedAt: new Date(), purchasedBy: "user-1", actualPrice: 4,
        list: { ownerId: "user-1", groupId: null },
      });
      (prisma.groceryItem.update as any).mockResolvedValue({
        id: "item-1", name: "Milk", category: "Dairy", quantity: 1, unit: "piece", actualPrice: 4,
      });

      await updateItemStatus("item-1", "PURCHASED");

      expect(prisma.pantryItem.create).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe("finalizeShoppingSession", () => {
    const milk = {
      id: "i1", name: "Milk", category: "Dairy", quantity: 1, unit: "piece", estimatedPrice: null,
    };

    beforeEach(() => {
      (auth as any).mockResolvedValue({ user: { id: "user-1" } });
      (prisma.category.findFirst as any).mockResolvedValue({ id: "cat-1", name: "Dairy" });
      (prisma.pantryItem.findFirst as any).mockResolvedValue(null);
      (prisma.pantryCategory.findFirst as any).mockResolvedValue(null);
    });

    it("only touches items the caller can write to (never a bare id lookup)", async () => {
      (prisma.groceryItem.findMany as any).mockResolvedValue([milk]);
      await finalizeShoppingSession({ i1: 10 });

      const where = (prisma.groceryItem.findMany as any).mock.calls[0][0].where;
      expect(where.status).toBe("PENDING");
      const branches = where.list.OR;
      expect(branches).toContainEqual({ ownerId: "user-1" });
      expect(branches).toContainEqual({ groupId: "__no_group__" }); // never `undefined`
      expect(JSON.stringify(branches)).not.toContain("undefined");
    });

    it("creates NO expense when nothing is pending (double tap / not your items)", async () => {
      (prisma.groceryItem.findMany as any).mockResolvedValue([]);
      await finalizeShoppingSession({ i1: 10 }, 12);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(prisma.pantryItem.create).not.toHaveBeenCalled();
    });

    it("scales category totals to the receipt total and sums exactly to it", async () => {
      (prisma.groceryItem.findMany as any).mockResolvedValue([
        milk,
        { ...milk, id: "i2", name: "Bread", category: "Bakery" },
      ]);
      await finalizeShoppingSession({ i1: 10, i2: 5 }, 16);

      const amounts = (prisma.transaction.create as any).mock.calls.map((c: any) => c[0].data.amount);
      expect(amounts.reduce((a: number, b: number) => Math.round((a + b) * 100) / 100, 0)).toBe(16);
      expect(prisma.pantryItem.create).toHaveBeenCalledTimes(2);
    });

    it("rejects invalid prices", async () => {
      await expect(finalizeShoppingSession({ i1: -1 })).rejects.toThrow("Invalid price");
      await expect(finalizeShoppingSession({ i1: Number.NaN })).rejects.toThrow("Invalid price");
    });
  });
});
