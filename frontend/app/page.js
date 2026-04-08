import Link from "next/link";

import LandingHero from "../components/LandingHero";
import SiteHeader from "../components/SiteHeader";

const highlightCards = [
  {
    title: "Strict Tenant Isolation",
    text: "Every lead, activity, and workflow stays locked to its own company with company-aware filtering at every layer.",
  },
  {
    title: "Role Driven Operations",
    text: "Super Admin, Admin, Manager, Sales, Marketing, and Support all get focused workflows instead of one overloaded screen.",
  },
  {
    title: "Scale Ready Core",
    text: "Pagination, indexed tables, assignment history, reminders, and Redis-ready scaling patterns keep the foundation production-minded.",
  },
];

export default function Home() {
  return (
    <div className="page-shell">
      <SiteHeader />

      <main className="landing-page">
        <LandingHero />

        <section className="info-band">
          <div className="section-intro">
            <span className="eyebrow">SaaS Sales Stack</span>
            <h2>One premium operating layer for leads, teams, products, and tenant-safe growth.</h2>
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
            <span className="eyebrow">Build Step By Step</span>
            <h2>We can keep extending this exact visual system in small pieces without compromising the UI.</h2>
          </div>

          <div className="cta-actions">
            <Link href="/register" className="button primary">
              Register Company
            </Link>
            <Link href="/book-demo" className="button ghost">
              Book a Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
