import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { LoginSchema } from "./validations/auth";
import bcrypt from "bcryptjs";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
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
      async authorize(credentials) {
        const validatedFields = LoginSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;

          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (!user || !user.password || !user.isActive || user.deletedAt) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(
            password,
            user.password,
          );

          if (passwordsMatch) return user;
        }

        return null;
      },
    }),
  ],
});
