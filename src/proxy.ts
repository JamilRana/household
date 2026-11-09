import authConfig from "@/lib/auth.config";
import NextAuth from "next-auth";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isCronRoute = nextUrl.pathname.startsWith("/api/cron");
  const isHealthRoute = nextUrl.pathname === "/api/health";
  const isAuthRoute = ["/login", "/register"].includes(nextUrl.pathname);

  // Allow API auth routes, cron endpoints, and health checks
  if (isApiAuthRoute || isCronRoute || isHealthRoute) return;

  // Root path: authenticated -> dashboard, unauthenticated -> login
  if (nextUrl.pathname === "/") {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
    return Response.redirect(new URL("/login", nextUrl));
  }

  // Already logged in users accessing login/register should go to dashboard
  if (isAuthRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
    return;
  }

  // Protected application routes
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }

  return;
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
