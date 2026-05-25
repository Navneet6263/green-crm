import "./globals.css";
import "./tailwind.css";
import { DEFAULT_METADATA } from "../lib/seo";
import { Toaster } from "react-hot-toast";

export const metadata = DEFAULT_METADATA;

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
