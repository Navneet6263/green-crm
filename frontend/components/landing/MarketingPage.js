import Link from "next/link";
import FloatingCTA from "./FloatingCTA";
import LandingFooter from "./LandingFooter";
import LandingNavbar from "./LandingNavbar";
import { btnPrimary, btnSecondary, sectionSub, sectionTitle } from "./landing-styles";

export default function MarketingPage({ children, structuredData }) {
  return (
    <div className="marketing-root min-h-screen bg-white text-slate-950">
      <LandingNavbar />
      <main>{children}</main>
      <LandingFooter />
      <FloatingCTA />
      {structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      ) : null}
    </div>
  );
}

export function PageHero({ eyebrow, title, description, primary = { label: "Book Free Demo →", href: "/book-demo" }, secondary, visual }) {
  return (
    <section className="relative overflow-hidden border-b border-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(12,96,93,0.09),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(232,189,0,0.08),transparent_50%)]" />
      <div className={`relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-20 ${visual ? "lg:grid-cols-2 lg:items-center" : ""}`}>
        <div className={visual ? "" : "mx-auto max-w-3xl text-center"}>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[12px] font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:leading-[1.1]">{title}</h1>
          <p className={`mt-6 text-lg leading-relaxed text-slate-600 ${visual ? "max-w-xl" : "mx-auto max-w-2xl"}`}>{description}</p>
          <div className={`mt-8 flex flex-wrap gap-3 ${visual ? "" : "justify-center"}`}>
            {primary ? <Link href={primary.href} className={btnPrimary}>{primary.label}</Link> : null}
            {secondary ? <Link href={secondary.href} className={btnSecondary}>{secondary.label}</Link> : null}
          </div>
        </div>
        {visual ? <div>{visual}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, description, align = "center" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">{eyebrow}</p> : null}
      <h2 className={`${sectionTitle} mt-2`}>{title}</h2>
      {description ? <p className={`${sectionSub} ${align === "center" ? "mx-auto" : ""}`}>{description}</p> : null}
    </div>
  );
}

export function CheckList({ items, className = "" }) {
  return (
    <ul className={`grid gap-2.5 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CtaBanner({ title = "See GreenCRM with your own workflow", description = "Book a free 30-minute demo. We will set it up around how your team sells — no commitment." }) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-gold-50 px-8 py-14 text-center shadow-[0_40px_100px_-40px_rgba(12,96,93,0.45)] sm:px-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-brand-200/50 blur-3xl" />
        <h2 className="relative text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{title}</h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">{description}</p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/book-demo" className={btnPrimary}>Book Free Demo →</Link>
          <Link href="/contact" className={btnSecondary}>Talk to Us</Link>
        </div>
      </div>
    </section>
  );
}
