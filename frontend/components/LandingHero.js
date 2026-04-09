import Link from "next/link";

const previewMetrics = [
  { label: "Active Leads", value: "148" },
  { label: "Teams Live", value: "07" },
  { label: "Reply Time", value: "9m" },
];

const roleSignals = [
  { title: "Admin View", text: "Company setup, user access, and product control from one place." },
  { title: "Sales View", text: "Warm leads, follow-ups, pipeline stages, and faster owner visibility." },
  { title: "Support View", text: "Notifications, tasks, and action queues without a noisy dashboard." },
];

export default function LandingHero() {
  return (
    <section className="landing-hero cloud-hero">
      <div className="cloud-hero-panel">
        <div className="cloud-hero-copy">
          <span className="eyebrow large">Cloud Weather Workspace</span>
          <h1>Your CRM, Your Rules</h1>
          <p>
            GreenCRM gives your company a calmer sky-blue workspace for leads, tasks, onboarding, access control, and
            role-based dashboards without the heavy dark look.
          </p>

          <div className="cloud-hero-actions">
            <Link href="/login" className="button primary">
              Get Start
            </Link>
          </div>

          <div className="cloud-hero-inline">
            <span>Need a new workspace?</span>
            <Link href="/register">Create company account</Link>
          </div>

          <div className="cloud-proof-strip">
            {previewMetrics.map((item) => (
              <article className="cloud-proof-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="cloud-hero-visual">
          <div className="cloud-scene">
            <div className="cloud-scene-topbar">
              <span>Live company onboarding</span>
              <span>Skyline mode</span>
            </div>

            <div className="cloud-scene-dashboard">
              <div className="cloud-scene-stat major">
                <span>Morning overview</span>
                <strong>142 leads moving</strong>
                <p>Assignments, reminders, and product tags update in one clean board.</p>
              </div>

              <div className="cloud-scene-grid">
                <article className="cloud-mini-card">
                  <span>Today</span>
                  <strong>32 follow-ups</strong>
                  <div className="cloud-line-chart">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                </article>

                <article className="cloud-mini-card highlight">
                  <span>Workspace access</span>
                  <strong>Admin owner live</strong>
                  <p>Signup captures company name, URL, team details, and owner context.</p>
                </article>
              </div>

              <article className="cloud-rule-card">
                <div className="cloud-rule-lines">
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <strong>Your CRM, Your Rules</strong>
                  <p>Keep every team, lead, and workflow under your company's own structure.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="cloud-role-stack">
            {roleSignals.map((item) => (
              <article className="cloud-role-card" key={item.title}>
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
