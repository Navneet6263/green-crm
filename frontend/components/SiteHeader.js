import Link from "next/link";

export default function SiteHeader({ compact = false }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        GreenCRM
      </Link>

      <nav className="site-nav">
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
        <Link href="/book-demo">Book Demo</Link>
        <Link href="/login" className={compact ? "button ghost" : "button primary"}>
          Get Started
        </Link>
      </nav>
    </header>
  );
}
