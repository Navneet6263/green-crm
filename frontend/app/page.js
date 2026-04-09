import Link from "next/link";

import LandingHero from "../components/LandingHero";
import SiteHeader from "../components/SiteHeader";

const highlightCards = [
  {
    title: "Calm Team Workspace",
    text: "Sales, managers, admins, and support all work from one clean surface instead of fighting cluttered modules.",
  },
  {
    title: "Company First Signup",
    text: "Create your workspace with company name, website, team size, owner details, and role context from the first screen.",
  },
  {
    title: "Tenant Safe CRM Core",
    text: "Company-aware data access, role routing, and workflow separation keep every workspace under the right rules.",
  },
];

export default function Home() {
  return (
    <div className="page-shell">
      <SiteHeader landing />

      <main className="landing-page">
        <LandingHero />

        <section className="info-band">
          <div className="section-intro">
            <span className="eyebrow">Cloudline Flow</span>
            <h2>Built for people who want a softer interface, clearer control, and a CRM that feels like their own space.</h2>
          </div>

          <div className="highlight-grid">
            {highlightCards.map((card) => (
              <article className="highlight-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div>
            <span className="eyebrow">Start Clean</span>
            <h2>Open the login flow now, then create your company workspace from the signup screen with the right business details.</h2>
          </div>

          <div className="cta-actions">
            <Link href="/login" className="button primary">
              Get Start
            </Link>
            <Link href="/register" className="button ghost">
              Create Workspace
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
