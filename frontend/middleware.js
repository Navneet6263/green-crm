import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/book-demo"];
const AUTH_NOINDEX_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const PLATFORM_CONSOLE_ROLES = ["super-admin", "platform-admin", "platform-manager"];
const LEGACY_DASHBOARD_REDIRECTS = {
  "/dashboard/superadmin": "/super-admin",
};
const ROLE_HOME_ROUTE = {
  "super-admin": "/super-admin",
  "platform-admin": "/super-admin",
  "platform-manager": "/super-admin",
  admin: "/dashboard/admin",
  manager: "/dashboard/manager",
  sales: "/dashboard/sales",
  marketing: "/dashboard/marketing",
  "legal-team": "/dashboard/legal",
  "finance-team": "/dashboard/finance",
  support: "/dashboard/support",
  viewer: "/dashboard/viewer",
};

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
  const role = request.cookies.get("authRole")?.value;

  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL(ROLE_HOME_ROUTE[role] || "/dashboard", request.url));
  }

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
