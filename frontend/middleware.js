import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/book-demo"];
const AUTH_NOINDEX_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const PLATFORM_CONSOLE_ROLES = ["super-admin", "platform-admin", "platform-manager"];
const LEGACY_DASHBOARD_REDIRECTS = {
  "/dashboard/superadmin": "/super-admin",
};

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
  const role = request.cookies.get("authRole")?.value;

  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    const response = NextResponse.next();
    if (AUTH_NOINDEX_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      response.headers.set("x-robots-tag", "noindex, nofollow");
    }
    return response;
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const legacyDashboardMatch = Object.entries(LEGACY_DASHBOARD_REDIRECTS).find(([prefix]) => pathname.startsWith(prefix));
  if (legacyDashboardMatch) {
    return NextResponse.redirect(new URL(legacyDashboardMatch[1], request.url));
  }

  if (pathname.startsWith("/super-admin") && !PLATFORM_CONSOLE_ROLES.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};
