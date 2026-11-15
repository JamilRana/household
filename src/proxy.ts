import authConfig from "@/lib/auth.config";
import NextAuth from "next-auth";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isCronRoute = nextUrl.pathname.startsWith("/api/cron");
  const isHealthRoute = nextUrl.pathname === "/api/health" || nextUrl.pathname === "/api/verify-email";
  const isAuthRoute = ["/login", "/register"].includes(nextUrl.pathname);
  // Password recovery works whether or not you are signed in
  const isRecoveryRoute = ["/forgot-password", "/reset-password"].includes(nextUrl.pathname);

  // Allow API auth routes, cron endpoints, and health checks
  if (isApiAuthRoute || isCronRoute || isHealthRoute || isRecoveryRoute) return;

  // Let root path pass through to src/app/page.tsx for database-verified session check
  if (nextUrl.pathname === "/") {
    return;
  }

  // Auth routes (/login, /register):
  // Do NOT redirect to /dashboard from edge middleware. Edge checks only verify
  // cookie signature without database user verification. AuthLayout safely
  // handles redirecting verified DB users to /dashboard, preventing infinite
  // redirect loops when stale or revoked cookies exist in the browser.
  if (isAuthRoute) {
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
