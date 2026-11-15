import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, clientIp } from "./rate-limit";
import { prisma } from "@/lib/db";

describe("rateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows attempts up to the limit", async () => {
    (prisma.rateLimit.upsert as any).mockResolvedValue({ count: 3, resetAt: new Date(Date.now() + 60_000) });
    const r = await rateLimit("login:a@b.c", 5, 60_000);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("blocks once the limit is exceeded and reports retry time", async () => {
    (prisma.rateLimit.upsert as any).mockResolvedValue({ count: 6, resetAt: new Date(Date.now() + 30_000) });
    const r = await rateLimit("login:a@b.c", 5, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets an expired window before counting", async () => {
    (prisma.rateLimit.upsert as any).mockResolvedValue({ count: 1, resetAt: new Date(Date.now() + 60_000) });
    await rateLimit("k", 5, 60_000);
    expect(prisma.rateLimit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ key: "k" }) })
    );
  });

  it("reads the first x-forwarded-for address", () => {
    const h = { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null) };
    expect(clientIp(h)).toBe("1.2.3.4");
  });
});
