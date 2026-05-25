"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { PLATFORM_CONSOLE_ROLES, ROLE_HOME_ROUTE } from "../../lib/roles";
import { clearSession } from "../../lib/session";
import { useLiveSessionProfile } from "../../lib/useLiveSessionProfile";
import AppLogo from "../branding/AppLogo";
import DashboardIcon from "./icons";
import { getRoleMeta } from "./shell-config";
import { useLeadTransfers } from "../leads/useLeadTransfers";
import LeadTransferModal from "../leads/LeadTransferModal";

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
  { prefix: "/settings/teams", accessKey: "team_management", label: "Team Management" },
  { prefix: "/settings/users", accessKey: "team_management", label: "Team Management" },
  { prefix: "/tasks", accessKey: "tasks", label: "Tasks" },
  { prefix: "/communications", accessKey: "communications", label: "Communications" },
  { prefix: "/attendance", accessKey: "attendance", label: "Attendance" },
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

function SidebarNavItem({ item, active, exactActive }) {
  const handleClick = (e) => {
    if (item.target === '_blank') {
      e.preventDefault();
      window.open(item.href, '_blank');
    } else if (exactActive) {
      e.preventDefault();
    }
  };

  return (
    <Link
      href={item.href}
      prefetch={false}
      scroll={false}
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-[#fef3c7] text-slate-950 shadow-[0_12px_28px_rgba(251,191,36,0.16)]"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl transition",
          active
            ? "bg-white text-[#f59e0b]"
            : "bg-white text-slate-500 group-hover:text-[#f59e0b]"
        )}
      >
        <DashboardIcon name={item.icon} className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={active ? "font-semibold text-[13px]" : "font-medium text-[13px]"}>{item.label}</span>
      </span>
      {active ? <span className="h-2 w-2 rounded-full bg-[#f59e0b]" /> : null}
    </Link>
  );
}

export default function DashboardShell({ session: initialSession, children, title, heroStats = [], hideTitle = false }) {
  const session = useLiveSessionProfile(initialSession);
  const router = useRouter();
  const pathname = usePathname();
  const { showModal, currentTransfer, totalPending, acknowledgeTransfer } = useLeadTransfers();
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
    let initialLoadTimeout;

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

    initialLoadTimeout = setTimeout(() => {
      loadNotifications();
      intervalId = setInterval(loadNotifications, 30000);
    }, 1200);

    return () => {
      ignore = true;
      clearTimeout(initialLoadTimeout);
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
      <div className="min-h-screen bg-[#f8fafc] text-slate-900">
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
          "fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col overflow-y-auto border-r border-slate-200 bg-white px-5 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.04)] transition-transform duration-300 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-[112%]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <Link href={ROLE_HOME_ROUTE[role] || "/"} prefetch={false} className="inline-flex max-w-[10.5rem] items-center">
            <AppLogo
              size="md"
              variant="sidebar"
              priority
            />
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

        <nav className="mt-8 flex-1 space-y-7">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <span className="px-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#b45309]/70">
                {section.title}
              </span>
              <div className="mt-3 space-y-1">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    exactActive={pathname === item.href}
                    item={item}
                    active={activeNavHref === item.href}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {hideTitle ? (
          <div className="mt-6 shrink-0 space-y-4 border-t border-slate-100 pt-5">
            <Link
              href="/settings/profile"
              prefetch={false}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition hover:border-amber-200"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
                {getInitials(session?.user?.name || session?.user?.full_name || "Preview User")}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-bold text-slate-950">{session?.user?.name || session?.user?.full_name || "Preview User"}</strong>
                <span className="block truncate text-xs font-medium text-slate-500">{session?.user?.talent_id || roleMeta.label}</span>
              </span>
              <DashboardIcon name="settings" className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
            <div className={cn("grid gap-2", showSeparateSettingsLink ? "grid-cols-2" : "grid-cols-1")}>
              {showSeparateSettingsLink ? (
                <Link href={settingsHref} prefetch={false} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-600 transition hover:bg-[#fef3c7] hover:text-[#b45309]">
                  Settings
                </Link>
              ) : null}
              <button type="button" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div className="min-h-screen py-0 lg:pl-[268px]">
        <div className="space-y-0">
          <header
            className={cn(
              "sticky top-0 z-20 border-b border-slate-100 bg-white px-5 py-3 md:px-7",
              hideTitle ? "" : ""
            )}
          >
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <button
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 lg:hidden"
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
              >
                <span className="flex flex-col gap-1">
                  <span className="block h-0.5 w-4 rounded-full bg-current" />
                  <span className="block h-0.5 w-4 rounded-full bg-current" />
                  <span className="block h-0.5 w-4 rounded-full bg-current" />
                </span>
              </button>

              {/* Quick actions — Add Lead + Add Customer + Recent Updates */}
              <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
                <Link
                  href="/leads/new"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-[13px] font-semibold text-amber-900 transition hover:bg-amber-100"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  Add Lead
                </Link>
                <Link
                  href="/customers/new"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-800"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                  Add Customer
                </Link>
                <Link
                  href="/recent-updates"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-[13px] font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Recent Updates
                </Link>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Bell */}
                <div className="relative" ref={notificationRef}>
                  <button
                    className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm"
                    onClick={() => setShowNotifications((current) => !current)}
                  >
                    <DashboardIcon name="bell" className="h-5 w-5" />
                    {unreadNotifications.length ? (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#F59E0B] px-1 text-[10px] font-bold text-white">
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
                                  ? "border-slate-100 bg-slate-50"
                                  : "border-amber-200 bg-amber-50"
                              )}
                              onClick={() => markNotificationRead(item.notif_id)}
                              disabled={pendingNotificationIds.includes(item.notif_id)}
                            >
                              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.is_read ? "bg-slate-300" : "bg-amber-500")} />
                              <div className="min-w-0 flex-1">
                                <strong className="block truncate text-sm text-slate-900">{item.title}</strong>
                                <span className="mt-0.5 block text-xs text-slate-500">{item.message}</span>
                              </div>
                              <span className="shrink-0 text-[11px] font-medium text-slate-400">{formatNotificationTime(item.created_at)}</span>
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

                  <div className="relative flex items-center gap-2" ref={accountRef}>
                  <Link
                    href="/communications"
                    prefetch={false}
                    className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-amber-200 hover:text-amber-600"
                    aria-label="Open communications"
                  >
                    <DashboardIcon name="mail" className="h-5 w-5" />
                  </Link>

                  <button
                    type="button"
                    className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm"
                    onClick={() => setShowAccountMenu((current) => !current)}
                  >
                    <DashboardIcon name="calendar" className="h-4 w-4 text-slate-500" />
                    <span className="hidden sm:block">
                      {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
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
                        <Link prefetch={false} href="/settings/profile" className="rounded-2xl border border-[#eadfcd] px-4 py-3 text-sm font-semibold text-[#5d503c]" onClick={() => setShowAccountMenu(false)}>Profile</Link>
                        {showSeparateSettingsLink ? (
                          <Link prefetch={false} href={settingsHref} className="rounded-2xl border border-[#eadfcd] px-4 py-3 text-sm font-semibold text-[#5d503c]" onClick={() => setShowAccountMenu(false)}>Settings</Link>
                        ) : null}
                        <Link prefetch={false} href="/support" className="rounded-2xl border border-[#eadfcd] px-4 py-3 text-sm font-semibold text-[#5d503c]" onClick={() => setShowAccountMenu(false)}>Support</Link>
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
              </div>
            </div>
          </header>

          <div className={cn("mx-auto max-w-[1280px] space-y-5 pb-6", hideTitle ? "px-4 pt-4 md:px-6 md:pt-5" : "px-4 pt-2 md:px-6")}>
            {heroStats.length ? (
              <section className={cn("grid gap-2", heroStats.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2")}>
                {heroStats.map((stat) => (
                  <article key={stat.label} className="rounded-xl border border-[#eadfcd] bg-white px-4 py-3">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8f816a]">{stat.label}</span>
                    <strong className="mt-1 block text-xl font-bold leading-none" style={{ color: stat.color || "#173e73" }}>
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
                  <Link prefetch={false} href={ROLE_HOME_ROUTE[role] || "/dashboard"} className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-[#060710] px-5 text-sm font-semibold text-white">
                    Go to Dashboard
                  </Link>
                  <Link prefetch={false} href="/settings/profile" className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700">
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
      {showModal && currentTransfer && (
        <LeadTransferModal
          transfer={currentTransfer}
          totalPending={totalPending}
          onAcknowledge={acknowledgeTransfer}
        />
      )}
    </div>
  );
}
