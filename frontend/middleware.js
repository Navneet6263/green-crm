import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/book-demo"];

const ROLE_ROUTE_PREFIX = {
  "/dashboard/superadmin": "super-admin",
  "/dashboard/admin": "admin",
  "/dashboard/manager": "manager",
  "/dashboard/sales": "sales",
  "/dashboard/marketing": "marketing",
  "/dashboard/legal": "legal-team",
  "/dashboard/finance": "finance-team",
  "/dashboard/support": "support",
  "/dashboard/viewer": "viewer",
};

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("authToken")?.value;
  const role = request.cookies.get("authRole")?.value;

  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/super-admin") && role !== "super-admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const dashboardMatch = Object.entries(ROLE_ROUTE_PREFIX).find(([prefix]) => pathname.startsWith(prefix));
  if (dashboardMatch && role !== dashboardMatch[1]) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
