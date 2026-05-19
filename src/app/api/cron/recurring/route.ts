import { NextResponse } from "next/server";
import { processRecurringTransactions } from "@/lib/actions/finance";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await processRecurringTransactions();
    return NextResponse.json({ 
      success: true, 
      ...result 
    });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Internal Server Error" 
    }, { status: 500 });
  }
}
