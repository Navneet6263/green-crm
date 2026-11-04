import "./globals.css";
import "./tailwind.css";
import { DEFAULT_METADATA } from "../lib/seo";
import { THEME_BOOT_SCRIPT } from "../lib/theme";
import { Toaster } from "react-hot-toast";

export const metadata = DEFAULT_METADATA;

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
