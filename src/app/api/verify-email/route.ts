import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const fail = NextResponse.redirect(new URL("/login?verified=0", url));

  if (!token || token.length > 200) return fail;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });

  if (!record || record.expires < new Date() || record.identifier.startsWith("pwd-reset:")) {
    return fail;
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: record.identifier },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token: tokenHash } }),
  ]);

  return NextResponse.redirect(new URL("/login?verified=1", url));
}
