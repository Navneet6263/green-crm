import Link from "next/link";

import LandingFooter from "./LandingFooter";
import LandingNavbar from "./LandingNavbar";

export default function BlogPostShell({ meta, children }) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fcf9_0%,#f5f7fb_34%,#ffffff_100%)] text-slate-950">
      <LandingNavbar />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          ← Back to Blog
        </Link>

        <div className="mt-6">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            {meta.tag}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl sm:leading-[1.1]">
            {meta.title}
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">{meta.description}</p>
        </div>

        <article className="prose-blog mt-10 grid gap-6">{children}</article>

        <div className="mt-14 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-8 text-center">
          <p className="text-xl font-semibold text-slate-950">
            Ready to try GreenCRM for your business?
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
            Book a free demo and see how GreenCRM helps Indian businesses manage leads, calls, WhatsApp, and attendance from one CRM.
          </p>
          <Link
            href="/book-demo"
            className="mt-5 inline-flex items-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Book Free Demo
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
