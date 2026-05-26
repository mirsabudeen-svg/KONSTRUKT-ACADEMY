import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  getUserRoleById,
  isTrainerOrAdminRole,
} from "@/lib/auth/trainer";
import { isAdminRole } from "@/lib/auth/admin";
import { getClerkDomain } from "@/lib/clerk-config";
import { updateSession } from "@/lib/supabase/middleware";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/missions(.*)",
  "/ai-terminal(.*)",
  "/admin(.*)",
  "/leaderboard(.*)",
  "/challenges(.*)",
  "/settings(.*)",
]);

const isTrainerRoute = createRouteMatcher([
  "/trainer(.*)",
  "/api/trainer(.*)",
]);

const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
  const supabaseResponse = await updateSession(req);

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (isTrainerRoute(req)) {
    await auth.protect();
    const { userId } = await auth();

    if (!userId) {
      if (req.nextUrl.pathname.startsWith("/api/trainer")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const role = await getUserRoleById(userId);

    if (!isTrainerOrAdminRole(role)) {
      if (req.nextUrl.pathname.startsWith("/api/trainer")) {
        return NextResponse.json(
          { error: "Forbidden — trainer or admin role required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (isAdminRoute(req)) {
    await auth.protect();
    const { userId } = await auth();

    if (!userId) {
      if (req.nextUrl.pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    const role = await getUserRoleById(userId);

    if (!isAdminRole(role)) {
      if (req.nextUrl.pathname.startsWith("/api/admin")) {
        return NextResponse.json(
          { error: "Forbidden — admin role required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return supabaseResponse;
  },
  {
    domain: getClerkDomain(),
    // Custom FAPI CNAME at clerk.xsedes.com — bypass Vercel auto-proxy (/__clerk),
    // which requires a proxy URL registered in the Clerk Dashboard.
    frontendApiProxy: {
      enabled: false,
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
