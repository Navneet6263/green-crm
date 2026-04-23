import Link from "next/link";

import AppLogo from "./branding/AppLogo";

const navItems = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Sign Up" },
];

export default function SiteHeader({ compact = false }) {

  return (
    <header className="site-header">
      <Link href="/" className="inline-flex items-center">
        <AppLogo
          size="sm"
          priority
          nameClassName="font-black uppercase tracking-[0.08em] text-[#183b67]"
          imageClassName="rounded-2xl border border-[#d1e3f4] bg-white shadow-[0_14px_24px_rgba(91,149,255,0.12)]"
        />
      </Link>

      <div className="site-nav">
        {navItems.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
        {!compact ? (
          <Link href="/login" className="button primary">
            Get Started
          </Link>
        ) : null}
      </div>
    </header>
  );
}
