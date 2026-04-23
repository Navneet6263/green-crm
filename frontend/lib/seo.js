import { BRAND_LOGO, BRAND_NAME } from "../components/branding/brandConfig";

const SITE_NAME = BRAND_NAME;
const DEFAULT_DESCRIPTION =
  "GreenCRM is a sales CRM for India that helps businesses manage leads, calls, WhatsApp, SMS, attendance, and dashboards from one fast workspace.";
const DEFAULT_KEYWORDS = [
  "GreenCRM",
  "GreenCall CRM",
  "CRM in Noida",
  "CRM software in Noida",
  "Best CRM software India",
  "Sales CRM India",
  "CRM for small business India",
  "Lead management CRM India",
  "CRM with calling feature",
  "CRM with WhatsApp integration",
];

function normalizeSiteUrl(value) {
  const fallback = "http://localhost:3000";
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.startsWith("http") ? rawValue : `https://${rawValue}`;

  try {
    return new URL(normalized).origin;
  } catch (_error) {
    return fallback;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_URL
  );
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  keywords = DEFAULT_KEYWORDS,
  index = true,
  type = "website",
} = {}) {
  const resolvedTitle = title || SITE_NAME;
  const canonical = absoluteUrl(path);
  const robots = index
    ? {
        index: true,
        follow: true,
      }
    : {
        index: false,
        follow: false,
        noarchive: true,
      };

  return {
    title: resolvedTitle,
    description,
    keywords,
    alternates: {
      canonical,
    },
    robots,
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type,
      locale: "en_IN",
      images: [
        {
          url: absoluteUrl(BRAND_LOGO.src),
          width: BRAND_LOGO.width,
          height: BRAND_LOGO.height,
          alt: `${SITE_NAME} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [absoluteUrl(BRAND_LOGO.src)],
    },
  };
}

export const DEFAULT_METADATA = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} | Sales CRM India for Leads, Calls and WhatsApp`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  keywords: DEFAULT_KEYWORDS,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: `${SITE_NAME} | Sales CRM India for Leads, Calls and WhatsApp`,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: absoluteUrl(BRAND_LOGO.src),
        width: BRAND_LOGO.width,
        height: BRAND_LOGO.height,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Sales CRM India for Leads, Calls and WhatsApp`,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(BRAND_LOGO.src)],
  },
  icons: {
    icon: BRAND_LOGO.src,
    shortcut: BRAND_LOGO.src,
    apple: BRAND_LOGO.src,
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "1y_xR8m5EhD-GBaJSQmBmXFZCPoC0lcXUrKoJxIn-0Y",
  },
};
