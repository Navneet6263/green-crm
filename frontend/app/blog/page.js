import Link from "next/link";

import LandingFooter from "../../components/landing/LandingFooter";
import LandingNavbar from "../../components/landing/LandingNavbar";
import { buildMetadata } from "../../lib/seo";

export const metadata = buildMetadata({
  title: "CRM Blog India | CRM Tips, Guides & Best Practices | GreenCRM",
  description:
    "Read GreenCRM's blog for CRM tips, guides, and best practices for small businesses and sales teams in India. Learn what is CRM, how CRM helps business, and more.",
  path: "/blog",
  keywords: [
    "CRM blog India",
    "what is CRM software",
    "how CRM helps small business",
    "best CRM tools India",
    "CRM vs Excel for sales",
    "why sales team needs CRM",
    "benefits of CRM for startups",
    "CRM tips India",
    "GreenCRM blog",
  ],
});

const posts = [
  {
    href: "/blog/what-is-crm-software",
    title: "What is CRM Software? A Simple Guide for Indian Businesses",
    description:
      "Learn what CRM software is, how it works, and why small businesses and sales teams in India need it to manage leads and customers.",
    tag: "Guide",
  },
  {
    href: "/blog/how-crm-helps-small-business",
    title: "How CRM Helps Small Business in India Grow Faster",
    description:
      "Discover how a CRM helps small businesses in India manage leads, follow-ups, and customer relationships without Excel or manual tracking.",
    tag: "Small Business",
  },
  {
    href: "/blog/best-crm-tools-india",
    title: "Best CRM Tools in India for Sales Teams in 2025",
    description:
      "A practical guide to the best CRM tools available in India for small businesses, startups, and sales teams with calling and WhatsApp features.",
    tag: "Comparison",
  },
  {
    href: "/blog/crm-vs-excel-for-sales",
    title: "CRM vs Excel for Sales: Why Your Team Needs to Switch",
    description:
      "Still managing leads in Excel? See why a CRM beats Excel for sales teams in India and how GreenCRM makes the switch easy.",
    tag: "Sales",
  },
  {
    href: "/blog/why-sales-team-needs-crm",
    title: "Why Every Sales Team in India Needs a CRM in 2025",
    description:
      "Learn why sales teams in India need a CRM to track calls, WhatsApp follow-ups, and lead pipeline instead of relying on manual methods.",
    tag: "Sales Team",
  },
  {
    href: "/blog/benefits-of-crm-for-startups",
    title: "Benefits of CRM for Startups in India — Why Start Early",
    description:
      "Discover the key benefits of using a CRM for your startup in India from day one. From lead management to automation and team dashboards.",
    tag: "Startups",
  },
];

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fcf9_0%,#f5f7fb_34%,#ffffff_100%)] text-slate-950">
      <LandingNavbar />
      <main className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            GreenCRM Blog
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.8rem]">
            CRM Tips & Guides for Indian Businesses
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Practical guides on CRM software, sales tips, and how to grow your business with better lead management, calling, and WhatsApp follow-ups.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="group rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:shadow-[0_24px_64px_rgba(16,185,129,0.1)]"
            >
              <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                {post.tag}
              </span>
              <h2 className="mt-4 text-base font-semibold leading-7 text-slate-950 group-hover:text-emerald-700">
                {post.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{post.description}</p>
              <p className="mt-4 text-sm font-semibold text-emerald-600">Read article →</p>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
