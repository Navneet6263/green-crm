import Link from "next/link";
import AppLogo from "../branding/AppLogo";
import { BRAND_NAME } from "../branding/brandConfig";
import { COMPANY, FOOTER_LINK_GROUPS, LEGAL_LINKS, SISTER_PRODUCTS } from "./landing-data";

const linkClass = "text-sm text-slate-600 transition hover:text-brand-700";

const SOCIAL_ICONS = {
  LinkedIn: <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z" />,
  Facebook: <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />,
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" />
    </>
  ),
  X: <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />,
  YouTube: <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />,
};

const CONTACT_ICONS = {
  address: <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  email: <path d="M4 6h16v12H4V6Zm0 0 8 7 8-7" />,
  whatsapp: <path d="M3 21l1.6-4.4A8.5 8.5 0 1 1 7.4 19.4L3 21Zm6-12.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2-1-1 1a4 4 0 0 1-2.9-2.9l1-1-1-2L9 8.5Z" />,
};

const CONTACTS = [
  { icon: "address", label: COMPANY.address, href: COMPANY.mapUrl, external: true },
  { icon: "phone", label: COMPANY.phone, href: COMPANY.phoneHref },
  { icon: "email", label: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { icon: "whatsapp", label: "Chat with us on WhatsApp", href: COMPANY.whatsappHref, external: true },
];

const externalProps = { target: "_blank", rel: "noopener noreferrer" };

function FooterLink({ link }) {
  if (link.external) {
    return <a href={link.href} className={linkClass} {...externalProps}>{link.label} ↗</a>;
  }
  return <Link href={link.href} className={linkClass}>{link.label}</Link>;
}

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-brand-100 bg-gradient-to-b from-cream via-white to-brand-50/60 text-slate-600">
      <div className="h-[3px] bg-gradient-to-r from-brand-700 via-gold-400 to-brand-500" />
      <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-[36rem] rounded-full bg-gold-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-72 w-[36rem] rounded-full bg-brand-200/40 blur-3xl" />

      {/* Main */}
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <Link href="/" className="inline-flex">
            <AppLogo size="md" variant="footer" />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            {BRAND_NAME} is a sales CRM built for Indian businesses. Manage leads, calls, WhatsApp, follow-ups, attendance and field team tracking — on the web and on your team&apos;s phones.
          </p>
          <p className="mt-3 text-sm">
            A product of{" "}
            <a href={COMPANY.website} {...externalProps} className="font-semibold text-brand-700 underline decoration-gold-400 decoration-2 underline-offset-4 hover:text-brand-800">{COMPANY.name}</a>
          </p>

          <ul className="mt-6 space-y-3">
            {CONTACTS.map((c) => (
              <li key={c.icon}>
                <a href={c.href} {...(c.external ? externalProps : {})} className="group flex items-start gap-3 text-sm transition hover:text-brand-800">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brand-100 bg-white text-brand-600 shadow-sm group-hover:border-gold-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{CONTACT_ICONS[c.icon]}</svg>
                  </span>
                  <span className="pt-1.5 leading-snug">{c.label}</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-2.5">
            {COMPANY.socials.map((s) => (
              <a key={s.name} href={s.href} {...externalProps} aria-label={`${COMPANY.name} on ${s.name}`} className="grid h-10 w-10 place-items-center rounded-full border border-brand-100 bg-white text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-50 hover:text-brand-800">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">{SOCIAL_ICONS[s.name]}</svg>
              </a>
            ))}
          </div>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-900">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}><FooterLink link={link} /></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Sister products */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 border-t border-brand-100 py-6 sm:flex-row sm:items-center">
          <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-slate-400">More from {COMPANY.name}</p>
          <div className="flex flex-wrap gap-2">
            {SISTER_PRODUCTS.map((p) => (
              <a key={p.label} href={p.href} {...externalProps} className="rounded-full border border-brand-100 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm transition hover:border-gold-400 hover:text-brand-700">
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-brand-100 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 pb-24 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-5 lg:px-8">
          <p>© {year} {COMPANY.name}. All rights reserved. {BRAND_NAME} — made in Noida, India.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <a key={l.label} href={l.href} {...externalProps} className="transition hover:text-brand-700">{l.label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
