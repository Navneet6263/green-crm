import "./globals.css";
import "./tailwind.css";
import { DEFAULT_METADATA } from "../lib/seo";

export const metadata = DEFAULT_METADATA;

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
