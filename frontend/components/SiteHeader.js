import Link from "next/link";

const navItems = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Sign Up" },
];

export default function SiteHeader({ compact = false }) {

  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        GreenCRM
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
