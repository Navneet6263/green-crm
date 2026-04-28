import Link from "next/link";

import AppLogo from "../branding/AppLogo";
import { BRAND_COPY, BRAND_NAME } from "../branding/brandConfig";
import { FOOTER_LINK_GROUPS } from "./landing-data";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/60 bg-[rgba(255,255,255,0.82)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="max-w-xl">
          <AppLogo size="lg" variant="footer" />
          <p className="mt-4 text-sm leading-7 text-[#5c6f68]">{BRAND_COPY.footer}</p>
          <div className="mt-6 rounded-[1.6rem] border border-[#e7ece5] bg-[#f9fbf7] p-5">
            <p className="text-sm font-semibold text-[#0d1f1b]">Need a walkthrough before you decide?</p>
            <p className="mt-2 text-sm leading-7 text-[#5c6f68]">
              Book a live demo and see how GreenCRM handles leads, follow-ups, tasks, and customer context.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/book-demo" className="inline-flex rounded-full bg-[#0f7a5f] px-4 py-2.5 text-sm font-semibold text-white">
                Book Demo
              </Link>
              <Link href="/login" className="inline-flex rounded-full border border-[#d8dfd4] bg-white px-4 py-2.5 text-sm font-semibold text-[#21453d]">
                Login
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-semibold text-[#0d1f1b]">{group.title}</p>
              <div className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-sm text-[#5c6f68] transition hover:text-[#0f7a5f]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-[#70827a] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
          <p>Built for cleaner follow-up discipline and better lead ownership.</p>
        </div>
      </div>
    </footer>
  );
}
