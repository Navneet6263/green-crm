"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { PLATFORM_CONSOLE_ROLES, ROLE_HOME_ROUTE } from "../../lib/roles";
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

function formatNotificationTime(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffMinutes < 1440) {
    return `${Math.floor(diffMinutes / 60)}h ago`;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
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
  if (PLATFORM_CONSOLE_ROLES.includes(role)) {
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
      prefetch={false}
      scroll={false}
      onClick={active ? (event) => event.preventDefault() : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-[22px] px-3 py-3 text-sm font-semibold transition",
        active
          ? "bg-[#f3e1ae] text-[#060710] shadow-[0_14px_28px_rgba(203,169,82,0.22)]"
          : "text-[#3d3529] hover:bg-white/80 hover:text-[#060710]"
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-2xl transition",
          active
            ? "bg-white text-[#060710]"
            : "bg-[#f6efe2] text-[#927f5e] group-hover:bg-white"
        )}
      >
        <DashboardIcon name={item.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
      </span>
      {active ? <span className="h-2.5 w-2.5 rounded-full bg-[#cba952]" /> : null}
    </Link>
  );
}

export default function DashboardShell({ session, children, title, heroStats = [], hideTitle = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [pendingNotificationIds, setPendingNotificationIds] = useState([]);
  const notificationRef = useRef(null);
  const accountRef = useRef(null);
  const sidebarRef = useRef(null);

  const role = session?.user?.role || "viewer";
  const roleMeta = getRoleMeta(role);
  const settingsHref = PLATFORM_CONSOLE_ROLES.includes(role)
    ? "/super-admin"
    : ["admin"].includes(role)
      ? "/settings/company"
      : "/settings/profile";
  const showSeparateSettingsLink = settingsHref !== "/settings/profile";
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
  const activeNavHref = useMemo(() => {
    const matches = visibleSections
      .flatMap((section) => section.items.map((item) => item.href))
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((left, right) => right.length - left.length);

    return matches[0] || "";
  }, [pathname, visibleSections]);
  const blockedFeature = useMemo(
    () => getBlockedFeature(pathname, role, companyAccess),
    [companyAccess, pathname, role]
  );
  const visibleNotifications = useMemo(
    () =>
      notificationFilter === "unread"
        ? notifications.filter((item) => !item.is_read)
        : notifications,
    [notificationFilter, notifications]
  );
  const sidebarScrollKey = useMemo(
    () => `greencrm:dashboard-sidebar-scroll:${role}`,
    [role]
  );

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const sidebar = sidebarRef.current;
    if (!sidebar) {
      return undefined;
    }

    const savedScroll = Number(window.sessionStorage.getItem(sidebarScrollKey) || 0);
    if (Number.isFinite(savedScroll) && savedScroll > 0) {
      sidebar.scrollTop = savedScroll;
    }

    const persistScroll = () => {
      window.sessionStorage.setItem(sidebarScrollKey, String(sidebar.scrollTop));
    };

    sidebar.addEventListener("scroll", persistScroll, { passive: true });

    return () => {
      persistScroll();
      sidebar.removeEventListener("scroll", persistScroll);
    };
  }, [sidebarScrollKey]);

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
  }, [session?.token]);

  async function markNotificationRead(notifId) {
    if (!session?.token || pendingNotificationIds.includes(notifId)) {
      return;
    }

    setPendingNotificationIds((current) =>
      current.includes(notifId) ? current : [...current, notifId]
    );

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
    } finally {
      setPendingNotificationIds((current) =>
        current.filter((item) => item !== notifId)
      );
    }
  }

  async function markAllNotificationsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.notif_id);

    if (!session?.token || !unreadIds.length || markingAllNotifications) {
      return;
    }

    setMarkingAllNotifications(true);
    setPendingNotificationIds((current) => [
      ...new Set([...current, ...unreadIds]),
    ]);

    try {
      const results = await Promise.allSettled(
        unreadIds.map((notifId) =>
          apiRequest(`/notifications/${notifId}/read`, {
            method: "PATCH",
            token: session.token,
          }).then(() => notifId)
        )
      );

      const successfulIds = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      );

      if (successfulIds.length) {
        setNotifications((current) =>
          current.map((item) =>
            successfulIds.includes(item.notif_id)
              ? { ...item, is_read: true }
              : item
          )
        );
      }
    } finally {
      setMarkingAllNotifications(false);
      setPendingNotificationIds((current) =>
        current.filter((item) => !unreadIds.includes(item))
      );
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbf6ec_0%,#fffaf2_48%,#fffdf9_100%)] text-slate-900">
      <div
        className={cn(
          "fixed inset-0 z-30 bg-[#060710]/45 backdrop-blur-sm transition lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setNavOpen(false)}
      />

      <aside
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[312px] flex-col overflow-y-auto border-r border-[#eadfcd] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(249,242,229,0.98))] px-5 py-6 shadow-[0_20px_70px_rgba(79,58,22,0.1)] transition-transform duration-300 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-[112%]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href={ROLE_HOME_ROUTE[role] || "/"} className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#060710] text-lg font-black text-white shadow-[0_16px_28px_rgba(6,7,16,0.2)]">
              G
            </span>
            <span>
              <strong className="block text-[1.05rem] tracking-[0.08em] text-[#060710]">GREENCRM</strong>
              <small className="block text-[10px] font-bold uppercase tracking-[0.28em] text-[#8e7f66]">Platform</small>
            </span>
          </Link>
          <button
            className="grid h-10 w-10 place-items-center rounded-2xl border border-[#e7dccb] bg-white text-[#6d604b] lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <span className="relative block h-4 w-4">
              <span className="absolute left-0 top-1/2 block h-0.5 w-4 -translate-y-1/2 rotate-45 rounded-full bg-current" />
              <span className="absolute left-0 top-1/2 block h-0.5 w-4 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
            </span>
          </button>
        </div>

        <nav className="mt-8 flex-1 space-y-6">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <span className="px-2 text-[11px] font-black uppercase tracking-[0.24em] text-[#9b8b71]">
                {section.title}
              </span>
              <div className="mt-3 space-y-1.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    active={activeNavHref === item.href}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {hideTitle ? (
          <div className="mt-6 shrink-0 border-t border-[#eadfcd] pt-5">
            <div className="rounded-[24px] border border-[#eadfcd] bg-white/96 px-4 py-4 shadow-[0_10px_24px_rgba(79,58,22,0.05)]">
              <span className="block text-[10px] font-black uppercase tracking-[0.24em] text-[#9b8b71]">
                Workspace Tools
              </span>

              <div className="mt-4 grid gap-2">
                <Link
                  href="/settings/profile"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-[#eadfcd] bg-[#fffaf1] px-3 text-sm font-semibold text-[#5d503c] transition hover:bg-white hover:text-[#060710]"
                >
                  Profile
                </Link>
                {showSeparateSettingsLink ? (
                  <Link
                    href={settingsHref}
                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-[#eadfcd] bg-[#fffaf1] px-3 text-sm font-semibold text-[#5d503c] transition hover:bg-white hover:text-[#060710]"
                  >
                    Settings
                  </Link>
                ) : null}
                <Link
                  href="/support"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-[#eadfcd] bg-[#fffaf1] px-3 text-sm font-semibold text-[#5d503c] transition hover:bg-white hover:text-[#060710]"
                >
                  Support
                </Link>
                <button
                  type="button"
                  className="inline-flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-2xl bg-[#060710] px-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(6,7,16,0.18)] transition hover:-translate-y-0.5"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="min-h-screen py-0 lg:pl-[312px]">
        <div className="space-y-0">
          <header
            className={cn(
              "sticky top-3 z-20 backdrop-blur",
              hideTitle
                ? "px-5 py-5 md:px-7 lg:hidden"
                : "mx-4 mt-4 rounded-[30px] border border-[#eadfcd] bg-white/78 px-4 py-4 shadow-[0_18px_45px_rgba(79,58,22,0.08)] md:px-6"
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <button
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-[#eadfcd] bg-white/90 text-[#6f604a] lg:hidden"
                    onClick={() => setNavOpen(true)}
                    aria-label="Open navigation"
                  >
                    <span className="flex flex-col gap-1">
                      <span className="block h-0.5 w-4 rounded-full bg-current" />
                      <span className="block h-0.5 w-4 rounded-full bg-current" />
                      <span className="block h-0.5 w-4 rounded-full bg-current" />
                    </span>
                  </button>
                  {!hideTitle && title ? (
                    <div className="min-w-0">
                      <h1 className="truncate text-[2rem] font-bold tracking-tight text-slate-900 md:text-[2.2rem]">{title}</h1>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="relative" ref={notificationRef}>
                  <button
                    className={cn(
                      "relative grid h-12 w-12 place-items-center rounded-2xl text-[#6f604a]",
                      hideTitle
                        ? "border border-[#eadfcd] bg-white/72 shadow-[0_10px_24px_rgba(79,58,22,0.06)]"
                        : "border border-[#eadfcd] bg-white text-[#6f604a] shadow-sm"
                    )}
                    onClick={() => setShowNotifications((current) => !current)}
                  >
                    <DashboardIcon name="bell" className="h-5 w-5" />
                    {unreadNotifications.length ? (
                      <span className="absolute -right-1 -top-1 rounded-full bg-[#1dbf73] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                      </span>
                    ) : null}
                  </button>

                  {showNotifications ? (
                    <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,420px)] rounded-[28px] border border-[#eadfcd] bg-white p-4 shadow-[0_28px_80px_rgba(79,58,22,0.16)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="block text-base text-slate-900">Notifications</strong>
                          <span className="text-sm text-slate-400">{unreadNotifications.length} unread</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-[#eadfcd] px-3 py-1 text-xs font-semibold text-[#6f604a]"
                            onClick={() => setNotificationFilter((f) => (f === "all" ? "unread" : "all"))}
                          >
                            Show {notificationFilter === "all" ? "Unread" : "All"}
                          </button>
                          <button
                            className="rounded-full border border-[#eadfcd] px-3 py-1 text-xs font-semibold text-[#6f604a] disabled:opacity-50"
                            onClick={markAllNotificationsRead}
                            disabled={!unreadNotifications.length || markingAllNotifications}
                          >
                            {markingAllNotifications ? "Updating..." : "Mark all read"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {loadingNotifications ? (
                          <div className="rounded-2xl bg-[#fffaf1] px-4 py-8 text-center text-sm text-[#8f816a]">Loading notifications...</div>
                        ) : visibleNotifications.length ? (
                          visibleNotifications.map((item) => (
                            <button
                              key={item.notif_id}
                              type="button"
                              className={cn(
                                "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                                item.is_read
                                  ? "border-[#eadfcd] bg-[#fffaf1]"
                                  : "border-emerald-100 bg-emerald-50/70"
                              )}
                              onClick={() => markNotificationRead(item.notif_id)}
                              disabled={pendingNotificationIds.includes(item.notif_id)}
                            >
                              <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", item.is_read ? "bg-slate-300" : "bg-emerald-500")} />
                              <div className="min-w-0 flex-1">
                                <strong className="block truncate text-sm text-slate-900">{item.title}</strong>
                                <span className="mt-1 block text-xs text-slate-500">{item.message}</span>
                              </div>
                              <span className="text-[11px] font-medium text-slate-400">{formatNotificationTime(item.created_at)}</span>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl bg-[#fffaf1] px-4 py-8 text-center text-sm text-[#8f816a]">
                            {notificationFilter === "unread" ? "No unread notifications." : "No notifications yet."}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {!hideTitle ? (
                  <div className="relative" ref={accountRef}>
                  <button
                    className={cn(
                      "flex items-center gap-3",
                      hideTitle
                        ? "rounded-[22px] px-0 py-0"
                        : "rounded-[24px] border border-[#eadfcd] bg-white px-4 py-3 shadow-sm"
                    )}
                    onClick={() => setShowAccountMenu((current) => !current)}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 text-sm font-bold text-white">
                      {getInitials(session?.user?.name || session?.user?.full_name || "Preview User")}
                    </span>
                    <span className="hidden text-left sm:block">
                      <strong className="block text-sm text-slate-900">{session?.user?.name || session?.user?.full_name || "Preview User"}</strong>
                      <span className="block text-xs text-slate-400">{session?.user?.talent_id || roleMeta.label}</span>
                    </span>
                  </button>

                  {showAccountMenu ? (
                    <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,320px)] rounded-[28px] border border-[#eadfcd] bg-white p-4 shadow-[0_28px_80px_rgba(79,58,22,0.16)]">
                      <div className="rounded-2xl bg-[#fffaf1] px-4 py-4">
                        <strong className="block text-base text-slate-900">{session?.user?.name || session?.user?.full_name || "Preview User"}</strong>
                        <span className="mt-1 block text-sm text-[#6f604a]">{session?.user?.email || "workspace@greencrm.app"}</span>
                        <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#8f816a]">
                          {session?.user?.talent_id || "Workspace User"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <Link href="/settings/profile" className="rounded-2xl border border-[#eadfcd] px-4 py-3 text-sm font-semibold text-[#5d503c]" onClick={() => setShowAccountMenu(false)}>Profile</Link>
                        {showSeparateSettingsLink ? (
                          <Link href={settingsHref} className="rounded-2xl border border-[#eadfcd] px-4 py-3 text-sm font-semibold text-[#5d503c]" onClick={() => setShowAccountMenu(false)}>Settings</Link>
                        ) : null}
                        <Link href="/support" className="rounded-2xl border border-[#eadfcd] px-4 py-3 text-sm font-semibold text-[#5d503c]" onClick={() => setShowAccountMenu(false)}>Support</Link>
                      </div>
                      <button
                        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#060710] px-4 py-3 text-sm font-semibold text-white"
                        onClick={logout}
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className={cn("space-y-5 pb-6 pr-4 md:pr-6", hideTitle && "px-5 pt-5 md:px-7 md:pt-6")}>
            {heroStats.length ? (
              <section className={cn("grid gap-3", heroStats.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2")}>
                {heroStats.map((stat) => (
                  <article key={stat.label} className="rounded-[26px] border border-[#eadfcd] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(79,58,22,0.06)]">
                    <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8f816a]">{stat.label}</span>
                    <strong className="mt-3 block text-[1.8rem] font-bold leading-none" style={{ color: stat.color || "#173e73" }}>
                      {formatHeroValue(stat.value)}
                    </strong>
                  </article>
                ))}
              </section>
            ) : null}

            {blockedFeature ? (
              <section className="rounded-[30px] border border-rose-200 bg-white px-6 py-6 shadow-[0_16px_40px_rgba(28,45,90,0.06)]">
                <div className="space-y-3">
                  <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-rose-600">Access Locked</span>
                  <h2 className="text-2xl font-bold text-slate-900">{blockedFeature.label} Locked</h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-500">
                    This tenant does not have access to {blockedFeature.label.toLowerCase()} right now. Enable it from
                    the super-admin Companies screen to restore the module.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={ROLE_HOME_ROUTE[role] || "/dashboard"} className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-[#060710] px-5 text-sm font-semibold text-white">
                    Go to Dashboard
                  </Link>
                  <Link href="/settings/profile" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">
                    Open Profile
                  </Link>
                </div>
              </section>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
