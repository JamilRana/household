import { NextResponse } from "next/server";
import { processRecurringTransactions } from "@/lib/jobs/recurring-transactions";
import crypto from "node:crypto";

function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;

  const expected = `Bearer ${secret}`;
  const authBuffer = Buffer.from(authHeader, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (authBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(authBuffer, expectedBuffer);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!verifyCronSecret(authHeader)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await processRecurringTransactions();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Cron Error (Recurring Transactions):", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
