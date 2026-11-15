import { prisma } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Fixed-window limiter stored in Postgres, so it works across serverless instances.
 * `key` should namespace the action and subject, e.g. `login:alice@example.com`.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // 1. Atomically reset an expired window
  await prisma.rateLimit.updateMany({
    where: { key, resetAt: { lte: now } },
    data: { count: 0, resetAt },
  });

  // 2. Atomically count this attempt (INSERT ... ON CONFLICT DO UPDATE)
  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: { count: { increment: 1 } },
  });

  const ok = row.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - row.count),
    retryAfterSec: ok ? 0 : Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

/** Forget a key (e.g. after a successful login). */
export async function clearRateLimit(key: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key } });
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: { get(name: string): string | null }): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}
