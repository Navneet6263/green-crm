import Link from "next/link";
import LandingFooter from "./LandingFooter";
import LandingNavbar from "./LandingNavbar";
import FloatingCTA from "./FloatingCTA";

export default function BlogPostShell({ meta, children }) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LandingNavbar />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to Blog
        </Link>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
            {meta.tag}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.1]">{meta.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{meta.description}</p>
        </div>

        <article className="prose-blog mt-10 grid gap-6">{children}</article>

        <div className="mt-14 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-900 p-8 text-center">
          <h2 className="text-xl font-bold text-white">Ready to try GreenCRM for your business?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            Book a free demo and see how GreenCRM helps Indian businesses manage leads, calls, WhatsApp, and attendance from one CRM.
          </p>
          <Link href="/book-demo" className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
            Book Free Demo →
          </Link>
        </div>
      </main>
      <LandingFooter />
      <FloatingCTA />
    </div>
  );
}
