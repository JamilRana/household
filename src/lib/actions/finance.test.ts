import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTransaction, deleteCategory, updateCategory } from "./finance";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

describe("Finance actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
  });

  const tx = () => ({
    type: "EXPENSE" as const,
    amount: 50,
    currency: "USD",
    categoryId: "cat-1",
    date: new Date(),
    paymentMethod: "CASH" as const,
    isRecurring: false,
  });

  describe("createTransaction", () => {
    it("stores the amount, an encrypted copy, and the caller as owner", async () => {
      (prisma.category.findFirst as any).mockResolvedValue({ id: "cat-1" });
      await createTransaction(tx());

      const data = (prisma.transaction.create as any).mock.calls[0][0].data;
      expect(data.amount).toBe(50);
      expect(data.userId).toBe("user-1");
      expect(typeof data.encryptedAmount).toBe("string");
      expect(data.encryptedAmount.length).toBeGreaterThan(10);
    });

    it("rejects a category the user cannot see", async () => {
      (prisma.category.findFirst as any).mockResolvedValue(null);
      await expect(createTransaction(tx())).rejects.toThrow("Category not found");
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it("rejects invalid amounts", async () => {
      await expect(createTransaction({ ...tx(), amount: -5 })).rejects.toThrow();
      await expect(createTransaction({ ...tx(), amount: 5_000_000_000 })).rejects.toThrow();
    });
  });

  describe("category ownership", () => {
    it("deleteCategory refuses categories the user does not own / system categories", async () => {
      (prisma.category.findFirst as any).mockResolvedValue(null);
      await expect(deleteCategory("someone-elses")).rejects.toThrow();
      expect(prisma.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "someone-elses", userId: "user-1", isSystem: false } })
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("deleteCategory archives (keeps history) when transactions use it", async () => {
      (prisma.category.findFirst as any).mockResolvedValue({ id: "c1" });
      (prisma.transaction.count as any).mockResolvedValue(3);
      await deleteCategory("c1");
      expect(prisma.category.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { isArchived: true } });
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("deleteCategory deletes an unused own category", async () => {
      (prisma.category.findFirst as any).mockResolvedValue({ id: "c1" });
      (prisma.transaction.count as any).mockResolvedValue(0);
      await deleteCategory("c1");
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    });

    it("updateCategory refuses categories the user does not own", async () => {
      (prisma.category.findFirst as any).mockResolvedValue(null);
      await expect(updateCategory("x", { name: "Hacked" })).rejects.toThrow();
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });
});
