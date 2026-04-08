import Link from "next/link";

const previewMetrics = [
  { label: "Pipeline", value: "INR 4.8Cr" },
  { label: "Active Teams", value: "12" },
  { label: "Unread Alerts", value: "28" },
];

const roleSignals = [
  { title: "Super Admin", text: "Tenant launch, platform safety, and access governance." },
  { title: "Admin", text: "Company control across leads, team, products, and support." },
  { title: "Support", text: "Inbox, escalations, and unread notifications from one surface." },
];

export default function LandingHero() {
  return (
    <section className="landing-hero">
      <div className="hero-stage-premium">
        <div className="hero-stage-copy">
          <span className="eyebrow large">GreenCRM Control Room</span>
          <h1>One serious CRM workspace for sales, support, admins, and platform ops.</h1>
          <p>
            Role-aware dashboards, tenant-safe data, workflow visibility, notifications, and company onboarding
            built into one premium operating layer.
          </p>

          <div className="hero-actions-inline">
            <Link href="/register" className="button primary">
              Launch Workspace
            </Link>
            <Link href="/login" className="button ghost">
              View CRM
            </Link>
          </div>

          <div className="hero-proof-strip">
            {previewMetrics.map((item) => (
              <article className="hero-proof-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="hero-stage-visual">
          <div className="hero-console">
            <div className="hero-console-topbar">
              <div className="hero-console-brand">
                <span className="hero-console-logo">G</span>
                <div>
                  <strong>GreenCRM</strong>
                  <span>Premium command center</span>
                </div>
              </div>
              <div className="hero-console-actions">
                <span>Live alerts</span>
                <span className="hero-console-badge">28 unread</span>
              </div>
            </div>

            <div className="hero-console-grid">
              <aside className="hero-console-sidebar">
                <span>Dashboard</span>
                <span>Companies</span>
                <span>Users</span>
                <span>Notifications</span>
                <span>Support</span>
              </aside>

              <div className="hero-console-main">
                <div className="hero-console-stats">
                  <article>
                    <span>Today</span>
                    <strong>156 leads</strong>
                  </article>
                  <article>
                    <span>Won</span>
                    <strong>32 deals</strong>
                  </article>
                  <article>
                    <span>Support</span>
                    <strong>11 pending</strong>
                  </article>
                </div>

                <div className="hero-console-panels">
                  <section className="hero-mini-panel">
                    <div className="hero-mini-header">
                      <strong>Notification Center</strong>
                      <span>Polling now</span>
                    </div>
                    <div className="hero-mini-list">
                      <div>
                        <strong>Lead reassigned to support</strong>
                        <span>2 mins ago</span>
                      </div>
                      <div>
                        <strong>Legal docs uploaded</strong>
                        <span>7 mins ago</span>
                      </div>
                      <div>
                        <strong>Finance invoice pending</strong>
                        <span>12 mins ago</span>
                      </div>
                    </div>
                  </section>

                  <section className="hero-mini-panel accent">
                    <div className="hero-mini-header">
                      <strong>Access Flow</strong>
                      <span>Super admin</span>
                    </div>
                    <div className="hero-mini-timeline">
                      <span>Create company</span>
                      <span>Create admin</span>
                      <span>Admin builds support team</span>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-role-stack">
            {roleSignals.map((item) => (
              <article className="hero-role-card" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
