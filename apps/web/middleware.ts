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

// Portrait-only routes — blocked when store mode is "digital"
const PORTRAIT_PATHS = [
  "/create",
  "/portraits",
  "/how-it-works",
  "/track",
  "/order",
];

// Module-level cache — middleware runs in the edge runtime where
// `next: { revalidate }` fetch hints are ignored, so we cache manually.
let maintenanceCached: boolean | null = null;
let maintenanceCachedAt = 0;

let storeModeCached: string | null = null;
let storeModeAt = 0;

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

  const apiBase =
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000";

  const now = Date.now();

  // ── Maintenance check ────────────────────────────────────────────────────────
  try {
    if (maintenanceCached === null || now - maintenanceCachedAt > CACHE_TTL_MS) {
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
    // API unreachable — don't block the storefront
  }

  // ── Store mode check — block portrait routes in digital mode ─────────────────
  const isPortraitPath = PORTRAIT_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isPortraitPath) {
    try {
      if (storeModeCached === null || now - storeModeAt > CACHE_TTL_MS) {
        const res = await fetch(`${apiBase}/api/settings/store-mode`);
        if (res.ok) {
          const data: { mode: string } = await res.json();
          storeModeCached = data.mode;
          storeModeAt     = now;
        }
      }

      if (storeModeCached === "digital") {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    } catch {
      // API unreachable — allow through
    }
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
