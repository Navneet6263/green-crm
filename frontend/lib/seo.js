import { BRAND_ICON, BRAND_ICONS, BRAND_NAME } from "../components/branding/brandConfig";

const SITE_NAME = BRAND_NAME;
const DEFAULT_DESCRIPTION =
  "GreenCRM is the best CRM software in India for small businesses, startups, and sales teams. Manage leads, calls, WhatsApp, SMS, attendance, and dashboards from one fast workspace. Affordable CRM in Noida with free demo.";
const DEFAULT_KEYWORDS = [
  "GreenCRM",
  "GreenCall CRM",
  "GreenCRM software",
  "GreenCRM India",
  "CRM software",
  "CRM software India",
  "best CRM software",
  "sales CRM",
  "CRM for business",
  "customer relationship management software",
  "CRM tools",
  "CRM system",
  "best CRM software for small business",
  "affordable CRM software India",
  "CRM software pricing India",
  "CRM with free demo",
  "CRM for startups India",
  "CRM software in India",
  "sales CRM India",
  "lead management CRM India",
  "CRM for small business India",
  "CRM for sales team India",
  "CRM software for startups",
  "simple CRM software India",
  "easy CRM for business",
  "CRM with calling",
  "CRM with WhatsApp",
  "CRM with SMS",
  "CRM with email integration",
  "CRM with automation",
  "CRM with pipeline management",
  "CRM in Noida",
  "CRM software in Noida",
  "best CRM in Noida",
  "CRM for small business in Noida",
  "CRM company in Noida",
  "CRM with calling and WhatsApp India",
  "CRM for sales team with call tracking",
  "CRM for field sales India",
  "CRM for local business India",
  "CRM with geo fencing",
  "CRM with attendance system",
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

function getSocialImage() {
  return BRAND_ICONS.icon512;
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
  const socialImage = getSocialImage();
  const robots = index
    ? { index: true, follow: true }
    : { index: false, follow: false, noarchive: true };

  return {
    title: resolvedTitle,
    description,
    keywords,
    alternates: {
      canonical,
    },
    robots,
    other: {
      "geo.region": "IN-UP",
      "geo.placename": "Noida, Uttar Pradesh, India",
      "geo.position": "28.5355;77.3910",
      ICBM: "28.5355, 77.3910",
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type,
      locale: "en_IN",
      images: [
        {
          url: absoluteUrl(socialImage.src),
          width: socialImage.width,
          height: socialImage.height,
          alt: `${SITE_NAME} CRM icon`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [absoluteUrl(socialImage.src)],
    },
  };
}

export const DEFAULT_METADATA = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} | Best CRM Software India - Leads, Calls, WhatsApp & Attendance`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  keywords: DEFAULT_KEYWORDS,
  other: {
    "geo.region": "IN-UP",
    "geo.placename": "Noida, Uttar Pradesh, India",
    "geo.position": "28.5355;77.3910",
    ICBM: "28.5355, 77.3910",
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: `${SITE_NAME} | Best CRM Software India - Leads, Calls, WhatsApp & Attendance`,
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: absoluteUrl(BRAND_ICONS.icon512.src),
        width: BRAND_ICONS.icon512.width,
        height: BRAND_ICONS.icon512.height,
        alt: `${SITE_NAME} CRM icon`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Best CRM Software India - Leads, Calls, WhatsApp & Attendance`,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl(BRAND_ICONS.icon512.src)],
  },
  icons: {
    icon: [
      {
        url: BRAND_ICON.src,
        type: BRAND_ICON.type,
        sizes: `${BRAND_ICON.width}x${BRAND_ICON.height}`,
      },
      {
        url: BRAND_ICONS.icon512.src,
        type: BRAND_ICONS.icon512.type,
        sizes: `${BRAND_ICONS.icon512.width}x${BRAND_ICONS.icon512.height}`,
      },
    ],
    shortcut: [BRAND_ICON.src],
    apple: [
      {
        url: BRAND_ICONS.apple.src,
        type: BRAND_ICONS.apple.type,
        sizes: `${BRAND_ICONS.apple.width}x${BRAND_ICONS.apple.height}`,
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "1y_xR8m5EhD-GBaJSQmBmXFZCPoC0lcXUrKoJxIn-0Y",
  },
};
