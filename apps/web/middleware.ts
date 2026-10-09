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

  // Check maintenance status from API
  try {
    const apiBase =
      process.env.API_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:5000";

    const res = await fetch(`${apiBase}/api/settings/maintenance`, {
      next: { revalidate: 30 },
    });

    if (res.ok) {
      const data: { enabled: boolean } = await res.json();
      if (data.enabled) {
        const url = req.nextUrl.clone();
        url.pathname = "/maintenance";
        return NextResponse.rewrite(url);
      }
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
