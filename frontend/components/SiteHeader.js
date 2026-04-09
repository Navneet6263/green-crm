import Link from "next/link";

export default function SiteHeader({ compact = false, landing = false }) {
  const navItems = compact
    ? [
        { href: "/", label: "Home" },
        { href: "/login", label: "Login" },
        { href: "/register", label: "Sign Up" },
      ]
    : landing
      ? []
      : [
          { href: "/login", label: "Login" },
          { href: "/register", label: "Sign Up" },
          { href: "/book-demo", label: "Book Demo" },
        ];

  return (
    <header className={`site-header${landing ? " landing" : ""}`}>
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
            Get Start
          </Link>
        ) : null}
      </div>
    </header>
  );
}
