/**
 * Root domain for Clerk's FAPI CNAME (clerk.{domain}).
 * Setting this disables Vercel's /__clerk auto-proxy so the browser talks to
 * clerk.xsedes.com directly — required when no proxy URL is registered in Clerk.
 */
export function getClerkDomain(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CLERK_DOMAIN?.trim();
  if (fromEnv) return fromEnv;

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const encoded = publishableKey.split("_").at(-1);
  if (!encoded) return "xsedes.com";

  try {
    const frontendApi = atob(encoded).replace(/\$$/, "");
    if (frontendApi.startsWith("clerk.")) {
      return frontendApi.slice("clerk.".length);
    }
  } catch {
    // fall through to default
  }

  return "xsedes.com";
}
