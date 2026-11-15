import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { LoginSchema } from "./validations/auth";
import bcrypt from "bcryptjs";
import { rateLimit, clearRateLimit, clientIp } from "@/lib/rate-limit";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = (user as any).sessionVersion || 1;
        token.role = (user as any).role || "USER";
      }

      if (token.sub) {
        // Enforce active session and revocation checks
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { sessionVersion: true, isActive: true, deletedAt: true, role: true },
        });

        if (!dbUser || !dbUser.isActive || dbUser.deletedAt || dbUser.sessionVersion !== token.sessionVersion) {
          // Token is revoked: user deactivated or password reset
          return null as any;
        }

        token.role = dbUser.role;
      }

      return token;
    },
    async session({ token, session }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  providers: [
    ...authConfig.providers,
    Credentials({
      async authorize(credentials, request) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          const normalizedEmail = email.toLowerCase();

          // Brute-force protection: per account AND per network address
          const ip = request?.headers ? clientIp(request.headers) : "unknown";
          const emailKey = `login:${normalizedEmail}`;
          const [byEmail, byIp] = await Promise.all([
            rateLimit(emailKey, 8, 15 * 60 * 1000),
            rateLimit(`login-ip:${ip}`, 40, 15 * 60 * 1000),
          ]);
          if (!byEmail.ok || !byIp.ok) return null;

          const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (!user || !user.password || !user.isActive || user.deletedAt) {
            return null;
          }

          // Opt-in: set REQUIRE_EMAIL_VERIFICATION=true once mail is configured
          if (process.env.REQUIRE_EMAIL_VERIFICATION === "true" && !user.emailVerified) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(
            password,
            user.password,
          );

          if (passwordsMatch) {
            await clearRateLimit(emailKey);
            return user;
          }
        }

        return null;
      },
    }),
  ],
});
