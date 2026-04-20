const SITE_NAME = "GreenCRM";
const DEFAULT_DESCRIPTION =
  "GreenCRM helps teams manage leads, customers, follow-ups, workflow handoffs, tasks, and role-based CRM operations from one workspace.";
const DEFAULT_KEYWORDS = [
  "GreenCRM",
  "CRM software",
  "lead management CRM",
  "customer management software",
  "sales CRM India",
  "workflow CRM",
  "team CRM platform",
  "follow-up management",
  "role based CRM",
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
          url: absoluteUrl("/icon.svg"),
          width: 512,
          height: 512,
          alt: `${SITE_NAME} logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description,
      images: [absoluteUrl("/icon.svg")],
    },
  };
}

export const DEFAULT_METADATA = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "GreenCRM | Leads, Customers, Workflow, and Team CRM",
    template: "%s | GreenCRM",
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
    title: "GreenCRM | Leads, Customers, Workflow, and Team CRM",
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: absoluteUrl("/icon.svg"),
        width: 512,
        height: 512,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GreenCRM | Leads, Customers, Workflow, and Team CRM",
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl("/icon.svg")],
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

