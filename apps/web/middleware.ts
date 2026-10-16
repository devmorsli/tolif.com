import { NextRequest, NextResponse } from "next/server";

// Routes that are always accessible even during maintenance
const BYPASS_PATHS = [
  "/maintenance",
  "/api/",
  "/_next/",
  "/favicon",
  "/robots",
  "/sitemap",
];

// Module-level cache — middleware runs in the edge runtime where
// `next: { revalidate }` fetch hints are ignored, so we cache manually.
let maintenanceCached: boolean | null = null;
let maintenanceCachedAt = 0;
const CACHE_TTL_MS = 30_000;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow admin, maintenance page, and static assets
  if (
    pathname.startsWith("/admin") ||
    BYPASS_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check maintenance bypass cookie
  if (req.cookies.get("maintenance_bypass")?.value === "1") {
    return NextResponse.next();
  }

  // Check maintenance status from API (cached for 30 s)
  try {
    const now = Date.now();
    if (maintenanceCached === null || now - maintenanceCachedAt > CACHE_TTL_MS) {
      const apiBase =
        process.env.API_INTERNAL_URL ??
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:5000";

      const res = await fetch(`${apiBase}/api/settings/maintenance`);
      if (res.ok) {
        const data: { enabled: boolean } = await res.json();
        maintenanceCached  = data.enabled;
        maintenanceCachedAt = now;
      }
    }

    if (maintenanceCached) {
      const url = req.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url);
    }
  } catch {
    // If the API is unreachable, don't block the storefront
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
