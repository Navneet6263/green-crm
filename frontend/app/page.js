import LandingDemoCta from "../components/landing/LandingDemoCta";
import LandingFeatureHighlights from "../components/landing/LandingFeatureHighlights";
import LandingFooter from "../components/landing/LandingFooter";
import LandingHero from "../components/landing/LandingHero";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingTestimonials from "../components/landing/LandingTestimonials";
import LandingTrustSection from "../components/landing/LandingTrustSection";
import LandingUseCases from "../components/landing/LandingUseCases";
import LandingWorkflow from "../components/landing/LandingWorkflow";
import { BRAND_LOGO, BRAND_NAME } from "../components/branding/brandConfig";
import { absoluteUrl, buildMetadata } from "../lib/seo";

const homeDescription =
  "GreenCRM is a fast sales CRM in Noida for small businesses. Manage leads, calls, WhatsApp, SMS, attendance, and dashboards in one place.";

export const metadata = buildMetadata({
  title: "CRM Software in Noida | Sales CRM India | GreenCRM",
  description: homeDescription,
  path: "/",
  keywords: [
    "CRM in Noida",
    "CRM software in Noida",
    "Best CRM software India",
    "Sales CRM India",
    "CRM for small business India",
    "CRM with calling feature",
    "CRM with WhatsApp integration",
    "CRM with SMS integration",
    "CRM with attendance system",
    "CRM with geo fencing",
    "Lead management CRM India",
    "GreenCRM",
    "GreenCall CRM",
  ],
});

export default function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND_NAME,
      alternateName: "GreenCall CRM",
      url: absoluteUrl("/"),
      logo: absoluteUrl(BRAND_LOGO.src),
      description: homeDescription,
      areaServed: ["Noida", "India"],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: BRAND_NAME,
      alternateName: "GreenCall CRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description: homeDescription,
      audience: {
        "@type": "Audience",
        audienceType: "Small businesses, startups, sales teams, and local businesses",
      },
      featureList: [
        "Lead management",
        "Click-to-call",
        "WhatsApp messaging",
        "SMS integration",
        "Attendance with geo fencing",
        "Multi-dashboard system",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      areaServed: {
        "@type": "Country",
        name: "India",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fcf9_0%,#f5f7fb_34%,#ffffff_100%)] text-slate-950">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatureHighlights />
        <LandingTrustSection />
        <LandingUseCases />
        <LandingWorkflow />
        <LandingTestimonials />
        <LandingDemoCta />
      </main>
      <LandingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
