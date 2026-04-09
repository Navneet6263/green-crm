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
      className={cn("ds-nav-item", active && "active")}
    >
      <span className="ds-nav-icon">
        <DashboardIcon name={item.icon} />
      </span>
      <span className="ds-nav-copy">
        <strong>{item.label}</strong>
      </span>
      {active && <span className="ds-nav-active-dot active" />}
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
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false);
  const [pendingNotificationIds, setPendingNotificationIds] = useState([]);
  const notificationRef = useRef(null);
  const accountRef = useRef(null);

  const role = session?.user?.role || "viewer";
  const roleMeta = getRoleMeta(role);
  const tenantName =
    session?.company?.name || (PLATFORM_CONSOLE_ROLES.includes(role) ? "Platform Workspace" : "Tenant Workspace");
  const tenantSlug = session?.company?.slug || "workspace";
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
    <div className="ds-app">
      <div
        className={cn("ds-overlay", navOpen && "active")}
        onClick={() => setNavOpen(false)}
      />

      <div className="ds-layout">
        <aside className={cn("ds-sidebar", navOpen && "open")}>
          <div className="ds-sidebar-top">
            <Link href={ROLE_HOME_ROUTE[role] || "/"} className="ds-brand-block">
              <span className="ds-brand-glyph">G</span>
              <span className="ds-brand-copy">
                <strong>GREENCRM</strong>
                <small>Platform</small>
              </span>
            </Link>
            <button
              className="ds-sidebar-close"
              onClick={() => setNavOpen(false)}
              aria-label="Close navigation"
            >
              <span />
              <span />
            </button>
          </div>

          <div className="ds-workspace-card">
            <div className="ds-workspace-headline">
              <div>
                <strong>{tenantName}</strong>
                <p>{tenantSlug}</p>
              </div>
              <span className="ds-workspace-pill">{roleMeta.label}</span>
            </div>
            <div className="ds-meta-grid">
              <div>
                <span>Date</span>
                <strong>{shortDate}</strong>
              </div>
            </div>
          </div>

          <nav className="ds-nav">
            {visibleSections.map((section) => (
              <div key={section.title} className="ds-nav-section">
                <span className="ds-nav-section-title">{section.title}</span>
                <div className="ds-nav-stack">
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
          
          <div className="ds-sidebar-footer">
            <div className="ds-footer-note">
              <strong>GreenCRM OS</strong>
              <span>Platform v2.0</span>
            </div>
          </div>
        </aside>

        <div className="ds-main">
          <header className="ds-topbar">
            <div className="ds-topbar-primary">
              <div className="ds-mobile-row">
                <button
                  className="ds-mobile-toggle"
                  onClick={() => setNavOpen(true)}
                >
                  <span />
                  <span />
                  <span />
                </button>
                <span className="ds-mobile-brand">GREENCRM</span>
              </div>
              <h1 className="ds-page-title">{title}</h1>
            </div>

            <div className="ds-topbar-secondary">
              <div className="ds-utility-row">
                <div className="ds-notification-wrap" ref={notificationRef}>
                  <button
                    className="ds-notification-button"
                    onClick={() => setShowNotifications((current) => !current)}
                  >
                    <DashboardIcon name="bell" />
                    {unreadNotifications.length ? (
                      <span className="ds-notification-count">
                        {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                      </span>
                    ) : null}
                  </button>

                  {showNotifications ? (
                    <div className="ds-notification-panel">
                      <div className="ds-notification-head">
                        <div>
                          <strong>Notifications</strong>
                          <span>{unreadNotifications.length} unread</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="ds-inline-link"
                            onClick={() => setNotificationFilter((f) => (f === "all" ? "unread" : "all"))}
                          >
                            Show {notificationFilter === "all" ? "Unread" : "All"}
                          </button>
                          <button
                            className="ds-inline-link"
                            onClick={markAllNotificationsRead}
                            disabled={!unreadNotifications.length || markingAllNotifications}
                          >
                            {markingAllNotifications ? "Updating..." : "Mark all read"}
                          </button>
                        </div>
                      </div>

                      <div className="ds-notification-list">
                        {loadingNotifications ? (
                          <div className="ds-notification-empty">Loading notifications...</div>
                        ) : visibleNotifications.length ? (
                          visibleNotifications.map((item) => {
                            const isPending = pendingNotificationIds.includes(item.notif_id);
                            return (
                              <div
                                key={item.notif_id}
                                className={cn("ds-notification-item", !item.is_read && "unread")}
                                onClick={() => markNotificationRead(item.notif_id)}
                              >
                                {!item.is_read ? <span className="ds-notification-marker" /> : <span />}
                                <div className="ds-notification-copy">
                                  <strong>{item.title}</strong>
                                  <span>{item.message}</span>
                                </div>
                                <span className="ds-notification-meta">{formatNotificationTime(item.created_at)}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="ds-notification-empty">
                            {notificationFilter === "unread" ? "No unread notifications." : "No notifications yet."}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="ds-account-wrap" ref={accountRef}>
                  <button
                    className="ds-account-chip"
                    onClick={() => setShowAccountMenu((current) => !current)}
                  >
                    <span className="ds-account-avatar">
                      {getInitials(session?.user?.name || session?.user?.full_name || "Preview User")}
                    </span>
                    <span className="ds-account-copy hidden sm:block text-left">
                      <strong>{session?.user?.name || session?.user?.full_name || "Preview User"}</strong>
                      <span>{session?.user?.talent_id || roleMeta.label}</span>
                    </span>
                  </button>

                  {showAccountMenu ? (
                    <div className="ds-account-menu">
                      <div className="ds-account-menu-head">
                        <strong>{session?.user?.name || session?.user?.full_name || "Preview User"}</strong>
                        <span>{session?.user?.email || "workspace@greencrm.app"}</span>
                        <span className="ds-account-talent">{session?.user?.talent_id || "Workspace User"}</span>
                      </div>

                      <div className="ds-account-menu-links">
                        <Link href="/settings/profile" className="ds-account-link" onClick={() => setShowAccountMenu(false)}>Profile</Link>
                        <Link href={PLATFORM_CONSOLE_ROLES.includes(role) ? "/super-admin" : ["admin"].includes(role) ? "/settings/company" : "/settings/profile"} className="ds-account-link" onClick={() => setShowAccountMenu(false)}>Settings</Link>
                        <Link href="/support" className="ds-account-link" onClick={() => setShowAccountMenu(false)}>Support</Link>
                      </div>
                      <button className="button ghost danger ds-account-logout" onClick={logout}>
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="ds-content">
            {heroStats.length ? (
              <section className={cn("hero-stat-cluster", heroStats.length >= 4 && "compact")}>
                {heroStats.map((stat) => (
                  <article key={stat.label} className="hero-stat">
                    <span>{stat.label}</span>
                    <strong style={{ color: stat.color || "#173e73" }}>{formatHeroValue(stat.value)}</strong>
                  </article>
                ))}
              </section>
            ) : null}

            {blockedFeature ? (
              <section className="panel">
                <div className="space-y-3">
                  <span className="ops-kicker">Access Locked</span>
                  <h2>{blockedFeature.label} Locked</h2>
                  <p className="muted">
                    This tenant does not have access to {blockedFeature.label.toLowerCase()} right now. Enable it from
                    the super-admin Companies screen to restore the module.
                  </p>
                </div>
                <div className="ops-action-row mt-5">
                  <Link href={ROLE_HOME_ROUTE[role] || "/dashboard"} className="button primary">
                    Go to Dashboard
                  </Link>
                  <Link href="/settings/profile" className="button">
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
