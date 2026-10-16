import Link from "next/link";
import LandingFooter from "./LandingFooter";
import LandingNavbar from "./LandingNavbar";
import FloatingCTA from "./FloatingCTA";

export default function BlogPostShell({ meta, children }) {
  return (
    <div className="marketing-root min-h-screen bg-white text-slate-950">
      <LandingNavbar />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Back to Blog
        </Link>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700">
            {meta.tag}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.1]">{meta.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{meta.description}</p>
        </div>

        <article className="prose-blog mt-10 grid gap-6">{children}</article>

        <div className="mt-14 rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-gold-50 p-8 text-center shadow-[0_30px_80px_-40px_rgba(12,96,93,0.45)]">
          <h2 className="text-2xl font-extrabold text-slate-900">Ready to try GreenCRM for your business?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Book a free demo and see how GreenCRM helps Indian businesses manage leads, calls, WhatsApp, and attendance from one CRM.
          </p>
          <Link href="/book-demo" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition hover:-translate-y-0.5 hover:shadow-xl">
            Book Free Demo →
          </Link>
        </div>
      </main>
      <LandingFooter />
      <FloatingCTA />
    </div>
  );
}
