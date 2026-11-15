/**
 * Real-database tenant isolation test.
 *
 * Skipped unless TEST_DATABASE_URL points at a DISPOSABLE Postgres (e.g. a Neon branch
 * with the schema applied via `prisma db push`). All other tests mock Prisma, so this
 * is the only one that can prove users cannot see or change each other's data.
 *
 *   TEST_DATABASE_URL=postgresql://... npx vitest run src/test/isolation.integration.test.ts
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("tenant isolation (real Postgres)", () => {
  let prisma: any;
  let setUser: (id: string) => void;
  let tasks: typeof import("@/lib/actions/tasks");
  let finance: typeof import("@/lib/actions/finance");
  const ids: { a?: string; b?: string; list?: string; task?: string; cat?: string } = {};

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    vi.resetModules();
    vi.doUnmock("@/lib/db");
    prisma = (await import("@/lib/db")).prisma;
    const authMod: any = await import("@/lib/auth");
    setUser = (id) => authMod.auth.mockResolvedValue({ user: { id, name: id } });
    tasks = await import("@/lib/actions/tasks");
    finance = await import("@/lib/actions/finance");

    const stamp = Date.now();
    const a = await prisma.user.create({ data: { email: `a-${stamp}@test.local`, name: "A" } });
    const b = await prisma.user.create({ data: { email: `b-${stamp}@test.local`, name: "B" } });
    ids.a = a.id;
    ids.b = b.id;

    const list = await prisma.taskList.create({ data: { name: "A private", ownerId: a.id } });
    const task = await prisma.task.create({ data: { listId: list.id, title: "A secret", createdBy: a.id } });
    const cat = await prisma.category.create({ data: { name: `Cat-${stamp}`, type: "EXPENSE", userId: a.id } });
    ids.list = list.id;
    ids.task = task.id;
    ids.cat = cat.id;

    setUser(a.id);
    await finance.createTransaction({
      type: "EXPENSE", amount: 12.34, currency: "USD", categoryId: cat.id,
      date: new Date(), paymentMethod: "CASH", isRecurring: false,
    } as any);
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.transaction.deleteMany({ where: { userId: { in: [ids.a!, ids.b!] } } });
    await prisma.task.deleteMany({ where: { createdBy: { in: [ids.a!, ids.b!] } } });
    await prisma.taskList.deleteMany({ where: { ownerId: { in: [ids.a!, ids.b!] } } });
    await prisma.category.deleteMany({ where: { userId: { in: [ids.a!, ids.b!] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.a!, ids.b!] } } });
    await prisma.$disconnect();
  });

  it("B (no group) cannot list A's task lists", async () => {
    setUser(ids.b!);
    const lists = await tasks.getTaskLists();
    expect(lists.map((l: any) => l.id)).not.toContain(ids.list);
  });

  it("B (no group) cannot read A's transactions", async () => {
    setUser(ids.b!);
    const txs = await finance.getTransactions();
    expect(txs.filter((t: any) => t.userId === ids.a)).toEqual([]);
  });

  it("B cannot change A's task", async () => {
    setUser(ids.b!);
    await expect(tasks.updateTaskStatus(ids.task!, "COMPLETED")).rejects.toThrow();
    const row = await prisma.task.findUnique({ where: { id: ids.task } });
    expect(row.status).toBe("NOT_STARTED");
  });

  it("B cannot delete or rename A's category", async () => {
    setUser(ids.b!);
    await expect(finance.deleteCategory(ids.cat!)).rejects.toThrow();
    await expect(finance.updateCategory(ids.cat!, { name: "pwned" })).rejects.toThrow();
  });
});
