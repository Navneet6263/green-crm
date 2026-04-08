"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { ROLE_HOME_ROUTE } from "../../lib/roles";
import { clearSession } from "../../lib/session";
import DashboardIcon from "./icons";
import { getRoleMeta } from "./shell-config";

function getInitials(name = "Preview User") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || "")
    .join("");
}

function formatHeroValue(value) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-IN").format(value);
  }

  return value ?? "--";
}

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

const ACCESS_ROUTE_RULES = [
  { prefix: "/leads", accessKey: "leads", label: "Leads" },
  { prefix: "/customers", accessKey: "customers", label: "Customers" },
  { prefix: "/workflow", accessKey: "workflow", label: "Workflow" },
  { prefix: "/settings/products", accessKey: "products", label: "Products" },
  { prefix: "/settings/users", accessKey: "team_management", label: "Team Management" },
  { prefix: "/tasks", accessKey: "tasks", label: "Tasks" },
  { prefix: "/calendar", accessKey: "calendar", label: "Calendar" },
  { prefix: "/communications", accessKey: "communications", label: "Communications" },
  { prefix: "/analytics", accessKey: "analytics", label: "Analytics" },
  { prefix: "/support", accessKey: "support", label: "Support" },
  { prefix: "/documents", accessKey: "documents", label: "Documents" },
  { prefix: "/performance", accessKey: "performance", label: "Performance" },
];

function parseServiceAccess(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue);
    } catch (_error) {
      return {};
    }
  }

  return typeof rawValue === "object" ? rawValue : {};
}

function getBlockedFeature(pathname, role, companyAccess) {
  if (role === "super-admin") {
    return null;
  }

  const matchedRule = ACCESS_ROUTE_RULES.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)
  );

  if (!matchedRule) {
    return null;
  }

  return companyAccess[matchedRule.accessKey] === false ? matchedRule : null;
}

function SidebarNavItem({ item, active }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition",
        active
          ? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900"
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition",
          active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
        )}
      >
        <DashboardIcon name={item.icon} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[15px] font-semibold">{item.label}</strong>
      </span>
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full transition",
          active ? "bg-emerald-400" : "bg-slate-300 group-hover:bg-slate-400"
        )}
      />
    </Link>
  );
}

export default function DashboardShell({ session, children, title, heroStats = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const notificationRef = useRef(null);
  const accountRef = useRef(null);

  const role = session?.user?.role || "viewer";
  const roleMeta = getRoleMeta(role);
  const tenantName =
    session?.company?.name || (role === "super-admin" ? "Platform Workspace" : "Tenant Workspace");
  const unreadNotifications = notifications.filter((item) => !item.is_read);
  const companyAccess = useMemo(
    () => parseServiceAccess(session?.company?.service_access),
    [session?.company?.service_access]
  );
  const visibleSections = useMemo(
    () =>
      roleMeta.sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => !item.accessKey || companyAccess[item.accessKey] !== false
          ),
        }))
        .filter((section) => section.items.length),
    [companyAccess, roleMeta.sections]
  );
  const blockedFeature = useMemo(
    () => getBlockedFeature(pathname, role, companyAccess),
    [companyAccess, pathname, role]
  );
  const shortDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    []
  );

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    let ignore = false;
    let intervalId;

    async function loadNotifications() {
      if (!session?.token) {
        return;
      }

      if (!ignore) {
        setLoadingNotifications(true);
      }

      try {
        const response = await apiRequest("/notifications?page_size=8", {
          token: session.token,
        });

        if (!ignore) {
          setNotifications(response.items || []);
        }
      } catch (_error) {
        if (!ignore) {
          setNotifications([]);
        }
      } finally {
        if (!ignore) {
          setLoadingNotifications(false);
        }
      }
    }

    loadNotifications();
    intervalId = setInterval(loadNotifications, 30000);

    return () => {
      ignore = true;
      clearInterval(intervalId);
    };
  }, [session?.token, pathname]);

  async function markNotificationRead(notifId) {
    if (!session?.token) {
      return;
    }

    try {
      await apiRequest(`/notifications/${notifId}/read`, {
        method: "PATCH",
        token: session.token,
      });

      setNotifications((current) =>
        current.map((item) =>
          item.notif_id === notifId ? { ...item, is_read: true } : item
        )
      );
    } catch (_error) {
      // Keep panel usable even if the mutation fails.
    }
  }

  async function logout() {
    try {
      if (session?.token) {
        await apiRequest("/auth/logout", {
          method: "POST",
          token: session.token,
        });
      }
    } catch (_error) {
      // Local cleanup still wins if the API fails.
    } finally {
      clearSession();
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition lg:hidden",
          navOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setNavOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[292px] flex-col border-r border-slate-200/80 bg-[#f7fafc] px-4 pb-4 pt-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-transform duration-300 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link href={ROLE_HOME_ROUTE[role] || "/"} className="flex items-center gap-3">
            <span className="grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-lime-300 text-xl font-black text-white shadow-[0_18px_30px_rgba(34,197,94,0.24)]">
              G
            </span>
            <span className="text-[1.05rem] font-black tracking-[0.08em] text-slate-900">
              GREENCRM
            </span>
          </Link>

          <button
            className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <span className="relative block h-4 w-4">
              <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 rotate-45 rounded-full bg-current" />
              <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
            </span>
          </button>
        </div>

        <section className="crm-surface mb-4 p-3.5">
          <div className="flex items-start justify-between gap-2.5">
            <div>
              <strong className="block text-[0.98rem] font-black text-slate-900">{tenantName}</strong>
            </div>
            <span className="crm-pill border border-emerald-100 bg-emerald-50 text-[10px] text-emerald-700">
              {roleMeta.label}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Access
              </span>
              <strong className="mt-1.5 block text-[0.98rem] font-bold text-slate-900">
                {roleMeta.label}
              </strong>
            </div>
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Date
              </span>
              <strong className="mt-1.5 block text-[0.98rem] font-bold text-slate-900">
                {shortDate}
              </strong>
            </div>
          </div>
        </section>

        <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
          {visibleSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="space-y-2">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={isActivePath(pathname, item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      <div className="lg:pl-[292px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[92px] max-w-[1440px] items-center justify-between gap-5 px-4 py-4 sm:px-6 xl:px-8">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-3 lg:hidden">
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                  onClick={() => setNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <span className="flex flex-col gap-1.5">
                    <span className="h-[2px] w-5 rounded-full bg-current" />
                    <span className="h-[2px] w-5 rounded-full bg-current" />
                    <span className="h-[2px] w-5 rounded-full bg-current" />
                  </span>
                </button>
                <Link href={ROLE_HOME_ROUTE[role] || "/"} className="text-sm font-black tracking-[0.14em] text-slate-900">
                  GREENCRM
                </Link>
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-[2.05rem] font-black tracking-tight text-slate-900">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="relative" ref={notificationRef}>
                <button
                  className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  onClick={() => setShowNotifications((current) => !current)}
                  aria-label="Open notifications"
                >
                  <DashboardIcon name="bell" className="h-5 w-5" />
                  {unreadNotifications.length ? (
                    <span className="absolute right-2 top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                    </span>
                  ) : null}
                </button>

                {showNotifications ? (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <strong className="block text-sm font-bold text-slate-900">Notifications</strong>
                        <span className="text-xs font-semibold text-slate-500">
                          {unreadNotifications.length} unread
                        </span>
                      </div>
                      <Link href="/communications" className="text-xs font-bold text-emerald-700">
                        Open feed
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {loadingNotifications ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          Loading notifications...
                        </div>
                      ) : notifications.length ? (
                        notifications.map((item) => (
                          <button
                            key={item.notif_id}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                              item.is_read
                                ? "border-slate-200 bg-slate-50 text-slate-600"
                                : "border-emerald-100 bg-emerald-50/70 text-slate-700"
                            )}
                            onClick={() => markNotificationRead(item.notif_id)}
                          >
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: item.is_read ? "#94a3b8" : roleMeta.color }}
                            />
                            <span className="min-w-0 flex-1">
                              <strong className="block truncate text-sm font-bold text-slate-900">{item.title}</strong>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{item.message}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              {item.type || "alert"}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={accountRef}>
                <button
                  className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                  onClick={() => setShowAccountMenu((current) => !current)}
                  aria-label="Open account menu"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-lime-300 text-sm font-black text-white shadow-[0_14px_24px_rgba(34,197,94,0.2)]">
                    {getInitials(session?.user?.name || session?.user?.full_name || "Preview User")}
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <strong className="block truncate text-[15px] font-bold text-slate-900">
                      {session?.user?.name || session?.user?.full_name || "Preview User"}
                    </strong>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                      {session?.user?.talent_id || roleMeta.label}
                    </span>
                  </div>
                </button>

                {showAccountMenu ? (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-40 w-[300px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                    <div className="border-b border-slate-200 pb-4">
                      <strong className="block text-sm font-bold text-slate-900">
                        {session?.user?.name || session?.user?.full_name || "Preview User"}
                      </strong>
                      <span className="mt-1 block text-sm text-slate-500">
                        {session?.user?.email || "workspace@greencrm.app"}
                      </span>
                      <span className="mt-3 inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                        {session?.user?.talent_id || "Workspace User"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <Link href="/settings/profile" className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900" onClick={() => setShowAccountMenu(false)}>
                        Profile
                      </Link>
                      <Link href={["super-admin", "admin"].includes(role) ? "/settings/company" : "/settings/profile"} className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900" onClick={() => setShowAccountMenu(false)}>
                        Settings
                      </Link>
                      <Link href="/support" className="rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900" onClick={() => setShowAccountMenu(false)}>
                        Support
                      </Link>
                    </div>

                    <button className="crm-btn-secondary mt-4 w-full" onClick={logout}>
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 xl:px-8">
          {heroStats.length ? (
            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {heroStats.map((stat) => (
                <article key={stat.label} className="crm-surface px-5 py-4">
                  <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {stat.label}
                  </span>
                  <strong
                    className="mt-3 block text-[1.9rem] font-black leading-none"
                    style={{ color: stat.color || "#0f172a" }}
                  >
                    {formatHeroValue(stat.value)}
                  </strong>
                </article>
              ))}
            </section>
          ) : null}

          <main>
            {blockedFeature ? (
              <section className="crm-surface p-6">
                <div className="space-y-3">
                  <span className="crm-kicker">Access Locked</span>
                  <h2 className="text-2xl font-black text-slate-900">{blockedFeature.label} Locked</h2>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600">
                    This tenant does not have access to {blockedFeature.label.toLowerCase()} right now. Enable it from
                    the super-admin Companies screen to restore the module.
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={ROLE_HOME_ROUTE[role] || "/dashboard"} className="crm-btn-primary">
                    Go to Dashboard
                  </Link>
                  <Link href="/settings/profile" className="crm-btn-secondary">
                    Open Profile
                  </Link>
                </div>
              </section>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
