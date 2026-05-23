import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  getUserRoleById,
  isTrainerOrAdminRole,
} from "@/lib/auth/trainer";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/missions(.*)",
  "/ai-terminal(.*)",
  "/admin(.*)",
]);

const isTrainerRoute = createRouteMatcher([
  "/trainer(.*)",
  "/api/trainer(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
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
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
