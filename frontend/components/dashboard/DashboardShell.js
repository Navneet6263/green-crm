"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { PLATFORM_CONSOLE_ROLES, ROLE_HOME_ROUTE } from "../../lib/roles";
import { clearSession } from "../../lib/session";
import { useLiveSessionProfile } from "../../lib/useLiveSessionProfile";
import { BRAND_ICONS, BRAND_LOGO_ON_DARK } from "../branding/brandConfig";
import DashboardIcon from "./icons";
import HeaderQuickActions from "./HeaderQuickActions";
import ThemeToggle from "../ui/ThemeToggle";
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

const SIDEBAR_COLLAPSED_KEY = "greencrm:sidebar-collapsed";

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
  { prefix: "/calendar", accessKey: "tasks", label: "Calendar" },
  { prefix: "/communications", accessKey: "communications", label: "Communications" },
  { prefix: "/attendance", accessKey: "attendance", label: "Attendance" },
  { prefix: "/pipeline", accessKey: ["analytics", "workflow"], label: "Pipeline" },
  { prefix: "/support", accessKey: "support", label: "Support" },
  { prefix: "/documents", accessKey: "documents", label: "Documents" },
  { prefix: "/performance", accessKey: "performance", label: "Performance" },
  { prefix: "/developer", accessKey: "developer_api", label: "Developer API" },
];
// Features that stay off until the super admin switches them on.
const OPT_IN_ACCESS = ["developer_api"];

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

  return isAccessOff(companyAccess, matchedRule.accessKey) ? matchedRule : null;
}

/** A page with a list of features (like Pipeline: analytics and workflow) is off only when all of them are off. */
function isAccessOff(companyAccess, accessKey) {
  if (!accessKey) return false;
  const keys = Array.isArray(accessKey) ? accessKey : [accessKey];
  return keys.every((key) => (OPT_IN_ACCESS.includes(key) ? companyAccess[key] !== true : companyAccess[key] === false));
}

function SidebarNavItem({ item, active, exactActive, collapsed }) {
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
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-[13.5px] transition",
        collapsed && "lg:justify-center lg:px-0",
        active
          ? "bg-white/[0.09] font-semibold text-white"
          : "font-medium text-[#b8c4dc] hover:bg-white/[0.05] hover:text-white"
      )}
    >
      {active ? <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-gold-500" /> : null}
      <DashboardIcon
        name={item.icon}
        className={cn("h-[18px] w-[18px] shrink-0 transition", active ? "text-gold-400" : "text-[#7f8db0] group-hover:text-white")}
      />
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "lg:hidden")}>{item.label}</span>
      {item.target === "_blank" && !collapsed ? <span className="text-[11px] text-[#7f8db0]">↗</span> : null}
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [pendingNotificationIds, setPendingNotificationIds] = useState([]);
  const notificationRef = useRef(null);
  const notificationVersion = useRef(0);
  const accountRef = useRef(null);
  const sidebarRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch (_error) {
      // Storage can be unavailable (private mode); the sidebar simply starts expanded.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch (_error) {
        // Ignore storage failures.
      }
      return next;
    });
  }

  const role = session?.user?.role || "viewer";
  const roleMeta = getRoleMeta(role);
  const settingsHref = PLATFORM_CONSOLE_ROLES.includes(role)
    ? "/super-admin"
    : ["admin"].includes(role)
      ? "/settings"
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
            (item) => !isAccessOff(companyAccess, item.accessKey)
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
      if (document.visibilityState === "hidden") return;
      const version = notificationVersion.current;
      if (!session?.token) {
        return;
      }

      if (!ignore) {
        setLoadingNotifications(true);
      }

      try {
        const response = await apiRequest(`/notifications?page_size=8&mine=1${notificationFilter === "unread" ? "&unread_only=true" : ""}`, {
          token: session.token,
        });

        if (!ignore && version === notificationVersion.current) {
          setNotifications(response.items || []);
          setUnreadCount(Number(response.meta?.unread_count || 0));
        }
      } catch (_error) {
        // A transient failure must not erase the user's existing inbox.
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
    const onVisible = () => { if (document.visibilityState === "visible") void loadNotifications(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      ignore = true;
      clearTimeout(initialLoadTimeout);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.token, notificationFilter]);

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
      notificationVersion.current += 1;
      if (notifications.some(item => item.notif_id === notifId && !item.is_read)) setUnreadCount(count => Math.max(0, count - 1));

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

    if (!session?.token || !unreadCount || markingAllNotifications) {
      return;
    }

    setMarkingAllNotifications(true);
    setPendingNotificationIds((current) => [
      ...new Set([...current, ...unreadIds]),
    ]);

    try {
      await apiRequest("/notifications/read-all", { method: "PATCH", token: session.token });
      notificationVersion.current += 1;
      setNotifications(current => current.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (_error) {
      // Keep unread state when the server could not acknowledge the operation.
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

  const userName = session?.user?.name || session?.user?.full_name || "Preview User";

  return (
      <div className="min-h-screen bg-[#f7f8f6] text-slate-900">
      <div
        className={cn(
          "fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm transition lg:hidden",
          navOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setNavOpen(false)}
      />

      <aside
        className={cn(
          "theme-light tw-buttons fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-[#0a1430] bg-gradient-to-b from-[#0c1a38] to-[#060d1f] text-white shadow-[4px_0_24px_-12px_rgba(11,22,48,0.6)] transition-[transform,width] duration-300 lg:translate-x-0",
          collapsed ? "lg:w-[76px]" : "lg:w-[248px]",
          navOpen ? "translate-x-0" : "-translate-x-[112%]"
        )}
      >
        <div className={cn("flex h-[60px] shrink-0 items-center justify-between gap-2 border-b border-black/40 px-4", collapsed && "lg:justify-center lg:px-2")}>
          {/* The landing logo with its dark green turned white, so it reads on navy. Gold CRM is unchanged. */}
          <Link href={ROLE_HOME_ROUTE[role] || "/"} prefetch={false} aria-label="GreenCRM home" className={cn("inline-flex items-center", collapsed && "lg:hidden")}>
            <img src={BRAND_LOGO_ON_DARK} alt="GreenCRM logo" width={136} height={24} className="h-auto w-[136px]" />
          </Link>
          {collapsed ? (
            <Link href={ROLE_HOME_ROUTE[role] || "/"} prefetch={false} className="hidden lg:block" title="GreenCRM">
              <img src={BRAND_ICONS.icon192.src} alt="GreenCRM" width={36} height={36} className="h-9 w-9 rounded-[10px]" />
            </Link>
          ) : null}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[#b8c4dc] hover:bg-white/10 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <nav ref={sidebarRef} className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Main navigation">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <p className={cn("px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#6f7fa3]", collapsed && "lg:hidden")}>
                {section.title}
              </p>
              {collapsed ? <div className="mx-auto mb-2 hidden h-px w-8 bg-white/10 lg:block" /> : null}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    exactActive={pathname === item.href}
                    item={item}
                    active={activeNavHref === item.href}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Name and log out live in the top-right account menu; the sidebar only keeps Collapse. */}
        <div className="hidden shrink-0 border-t border-black/40 p-3 lg:block">
          <button type="button" onClick={toggleCollapsed} aria-pressed={collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden w-full items-center justify-center gap-2 rounded-[8px] py-2 text-xs font-medium text-[#7f8db0] transition hover:bg-white/[0.05] hover:text-white lg:flex">
            <svg className={cn("h-4 w-4 transition-transform", collapsed ? "rotate-180" : "")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            {collapsed ? null : "Collapse"}
          </button>
        </div>
      </aside>

      <div className={cn("min-h-screen py-0 transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]")}>
        <div className="space-y-0">
          <header className="tw-buttons sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
            <div className="flex h-[60px] items-center gap-3 px-4 md:px-6">
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-slate-200 text-slate-500 lg:hidden"
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </button>

              <span className="sr-only">{title || roleMeta.label}</span>

              <div className="ml-auto flex items-center gap-1.5">
                {role !== "expert" ? (
                  <div className="hidden items-center gap-1.5 lg:flex">
                    <Link href="/leads/new" prefetch={false}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
                      Add Lead
                    </Link>
                    <Link href="/customers/new" prefetch={false}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-800">
                      Add Customer
                    </Link>
                  </div>
                ) : null}

                <ThemeToggle />
                {role !== "expert" ? <HeaderQuickActions token={session?.token} /> : null}
                {role !== "expert" ? (
                  <Link href="/recent-updates" prefetch={false} title="Recent updates" aria-label="Recent updates"
                    className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                    <DashboardIcon name="notes" className="h-[18px] w-[18px]" />
                  </Link>
                ) : null}
                {role !== "expert" ? (
                  <Link href="/email" prefetch={false} title="Email" aria-label="Open email"
                    className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                    <DashboardIcon name="mail" className="h-[18px] w-[18px]" />
                  </Link>
                ) : null}

                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    className={cn("relative grid h-9 w-9 place-items-center rounded-[10px] transition", showNotifications ? "bg-brand-50 text-brand-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")}
                    onClick={() => setShowNotifications((current) => !current)}
                    aria-label="Notifications"
                    aria-expanded={showNotifications}
                  >
                    <DashboardIcon name="bell" className="h-[18px] w-[18px]" />
                    {unreadCount ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </button>

                  {showNotifications ? (
                    <div className="fixed left-3 right-3 top-[68px] z-30 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-[16px] border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[400px]">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div>
                          <strong className="block text-[15px] text-slate-900">Notifications</strong>
                          <span className="text-xs text-slate-500">{unreadCount} unread</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button type="button"
                            className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            onClick={() => setNotificationFilter((f) => (f === "all" ? "unread" : "all"))}>
                            {notificationFilter === "all" ? "Unread only" : "Show all"}
                          </button>
                          <button type="button"
                            className="rounded-full px-2.5 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-50 disabled:opacity-40"
                            onClick={markAllNotificationsRead}
                            disabled={!unreadCount || markingAllNotifications}>
                            {markingAllNotifications ? "Updating…" : "Mark all read"}
                          </button>
                        </div>
                      </div>

                      <div className="p-2">
                        {loadingNotifications && !notifications.length ? (
                          <div className="px-4 py-8 text-center text-sm text-slate-400">Loading notifications…</div>
                        ) : visibleNotifications.length ? (
                          visibleNotifications.map((item) => (
                            <button
                              key={item.notif_id}
                              type="button"
                              className={cn("flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left transition hover:bg-slate-50", !item.is_read && "bg-brand-50/40")}
                              onClick={() => {
                                void markNotificationRead(item.notif_id);
                                const destination = item.action_url || (item.lead_id ? `/leads/${encodeURIComponent(item.lead_id)}` : "");
                                if (destination) {
                                  try {
                                    const url = new URL(destination, window.location.origin);
                                    if (url.origin === window.location.origin) { setShowNotifications(false); router.push(url.pathname + url.search); }
                                  } catch (_) { /* Ignore malformed notification destinations. */ }
                                }
                              }}
                              disabled={pendingNotificationIds.includes(item.notif_id)}
                            >
                              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.is_read ? "bg-slate-200" : "bg-gold-500")} />
                              <div className="min-w-0 flex-1">
                                <strong className={cn("block truncate text-[13px]", item.is_read ? "font-medium text-slate-600" : "text-slate-900")}>{item.title}</strong>
                                <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{item.message}</span>
                              </div>
                              <span className="shrink-0 text-[11px] text-slate-400">{formatNotificationTime(item.created_at)}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-slate-400">
                            {notificationFilter === "unread" ? "You are all caught up." : "No notifications yet."}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative ml-1 border-l border-slate-200 pl-2.5" ref={accountRef}>
                  <button
                    type="button"
                    className="flex h-9 items-center gap-2 rounded-[10px] pl-1 pr-2 transition hover:bg-slate-100"
                    onClick={() => setShowAccountMenu((current) => !current)}
                    aria-expanded={showAccountMenu}
                    aria-label="Account menu"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{getInitials(userName)}</span>
                    <span className="hidden text-left leading-tight xl:block">
                      <span className="block max-w-[140px] truncate text-[13px] font-semibold text-slate-900">{userName}</span>
                      <span className="block text-[11px] text-slate-500">{roleMeta.label}</span>
                    </span>
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                  </button>

                  {showAccountMenu ? (
                    <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(92vw,280px)] overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]">
                      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-br from-brand-50 to-white px-4 py-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-bold text-white">{getInitials(userName)}</span>
                        <div className="min-w-0">
                          <strong className="block truncate text-sm text-slate-900">{userName}</strong>
                          <span className="block truncate text-xs text-slate-500">{session?.user?.email || roleMeta.label}</span>
                        </div>
                      </div>
                      <div className="grid p-1.5">
                        <Link prefetch={false} href="/settings/profile" className="rounded-[10px] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setShowAccountMenu(false)}>My profile</Link>
                        {showSeparateSettingsLink ? (
                          <Link prefetch={false} href={settingsHref} className="rounded-[10px] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setShowAccountMenu(false)}>Settings</Link>
                        ) : null}
                        <Link prefetch={false} href="/support" className="rounded-[10px] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setShowAccountMenu(false)}>Help & support</Link>
                      </div>
                      <div className="border-t border-slate-100 p-1.5">
                        <button type="button" className="w-full rounded-[10px] px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50" onClick={logout}>
                          Log out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className={cn("mx-auto max-w-[1280px] space-y-5 pb-6", hideTitle ? "px-4 pt-4 md:px-6 md:pt-5" : "px-4 pt-2 md:px-6")}>
            {heroStats.length ? (
              <section className={cn("grid gap-2", heroStats.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2")}>
                {heroStats.map((stat) => {
                  const content = (
                    <>
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8f816a]">{stat.label}</span>
                      <strong className="mt-1 block text-xl font-bold leading-none text-left" style={{ color: stat.color || "#173e73" }}>
                        {formatHeroValue(stat.value)}
                      </strong>
                    </>
                  );

                  return stat.onClick ? (
                    <button
                      key={stat.label}
                      type="button"
                      className="rounded-xl border border-[#eadfcd] bg-white px-4 py-3 text-left cursor-pointer hover:border-blue-400 hover:shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={stat.onClick}
                    >
                      {content}
                    </button>
                  ) : (
                    <article key={stat.label} className="rounded-xl border border-[#eadfcd] bg-white px-4 py-3">
                      {content}
                    </article>
                  );
                })}
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
