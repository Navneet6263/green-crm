import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/forgot-password", "/reset-password", "/book-demo"];
// Marketing pages listed in app/sitemap.js; they must open without a login for visitors and search engines.
const MARKETING_ROUTES = [
  "/features",
  "/field-sales-app",
  "/security",
  "/about",
  "/contact",
  "/services",
  "/blog",
  "/crm-software-india",
  "/crm-in-noida",
  "/crm-for-small-business",
  "/crm-with-calling",
  "/crm-with-whatsapp",
  "/crm-for-sales-team",
  "/crm-for-startups",
  "/crm-with-attendance",
];
const AUTH_NOINDEX_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const PLATFORM_CONSOLE_ROLES = ["super-admin", "platform-admin", "platform-manager"];
const LEGACY_DASHBOARD_REDIRECTS = {
  "/dashboard/superadmin": "/super-admin",
  // The role dashboards were merged into /dashboard.
  ...Object.fromEntries(["admin", "manager", "sales", "marketing", "legal", "finance", "support", "viewer"].map((role) => [`/dashboard/${role}`, "/dashboard"])),
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/brand") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("authToken")?.value;
  const role = request.cookies.get("authRole")?.value;

  if ([...PUBLIC_ROUTES, ...MARKETING_ROUTES].some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    const response = NextResponse.next();

    if (AUTH_NOINDEX_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      response.headers.set("x-robots-tag", "noindex, nofollow");
    }

    return response;
  }

  if (!token) {
    // Remember the page (for example a lead link from an email) so login can open it.
    const login = new URL("/login", request.url);
    if (pathname !== "/dashboard") login.searchParams.set("next", `${pathname}${request.nextUrl.search || ""}`);
    return NextResponse.redirect(login);
  }

  // Communications and the old Emails page are now one Email page.
  if (pathname === "/communications" || pathname === "/inbox") {
    const target = new URL("/email", request.url);
    request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    if (pathname === "/inbox") target.searchParams.set("tab", "sent");
    return NextResponse.redirect(target);
  }

  // Analytics and the Workflow tracker are now one Pipeline page (the legal and finance queues stay where they are).
  if (pathname === "/analytics" || pathname === "/workflow") {
    const target = new URL("/pipeline", request.url);
    request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    target.searchParams.set("tab", pathname === "/workflow" ? "workflow" : "insights");
    return NextResponse.redirect(target);
  }

  const legacyDashboardMatch = Object.entries(LEGACY_DASHBOARD_REDIRECTS).find(([prefix]) =>
    pathname.startsWith(prefix)
  );

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
  matcher: ["/((?!_next|brand|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)"],
};
