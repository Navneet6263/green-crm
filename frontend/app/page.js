import LandingDemoCta from "../components/landing/LandingDemoCta";
import LandingFaq from "../components/landing/LandingFaq";
import LandingFeatureHighlights from "../components/landing/LandingFeatureHighlights";
import LandingFieldApp from "../components/landing/LandingFieldApp";
import LandingFooter from "../components/landing/LandingFooter";
import LandingHero from "../components/landing/LandingHero";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingProblem from "../components/landing/LandingProblem";
import LandingTrustSection from "../components/landing/LandingTrustSection";
import LandingUseCases from "../components/landing/LandingUseCases";
import LandingWorkflow from "../components/landing/LandingWorkflow";
import FloatingCTA from "../components/landing/FloatingCTA";
import { BRAND_ICONS, BRAND_NAME } from "../components/branding/brandConfig";
import { COMPANY, FAQ_ITEMS } from "../components/landing/landing-data";
import { absoluteUrl, buildMetadata } from "../lib/seo";

const homeDescription =
  "GreenCRM is the best CRM software in Noida and India for small businesses, startups, and sales teams. Manage leads, calls, WhatsApp, SMS, attendance, and field team GPS tracking with an Android sales app. Book a free demo today.";

export const metadata = buildMetadata({
  title: "Best CRM Software India | CRM in Noida | Sales CRM for Small Business - GreenCRM",
  description: homeDescription,
  path: "/",
  keywords: [
    "GreenCRM",
    "GreenCall CRM",
    "GreenCRM India",
    "CRM software",
    "CRM software India",
    "best CRM software",
    "best CRM software for small business",
    "sales CRM",
    "CRM for business",
    "customer relationship management software",
    "affordable CRM software India",
    "CRM with free demo",
    "CRM for startups India",
    "CRM software in India",
    "sales CRM India",
    "lead management CRM India",
    "CRM for small business India",
    "CRM for sales team India",
    "simple CRM software India",
    "CRM with calling",
    "CRM with WhatsApp",
    "CRM with SMS",
    "CRM with pipeline management",
    "CRM in Noida",
    "CRM software in Noida",
    "best CRM in Noida",
    "CRM for small business in Noida",
    "CRM company in Noida",
    "CRM with calling and WhatsApp India",
    "CRM for sales team with call tracking",
    "CRM for field sales India",
    "CRM with GPS tracking",
    "CRM with mobile app India",
    "CRM with attendance system",
  ],
});

export default function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: BRAND_NAME,
      alternateName: ["GreenCall CRM", "GreenCRM India"],
      url: absoluteUrl("/"),
      logo: absoluteUrl(BRAND_ICONS.icon512.src),
      description: homeDescription,
      areaServed: ["Noida", "Delhi NCR", "India"],
      address: {
        "@type": "PostalAddress",
        streetAddress: COMPANY.streetAddress,
        addressLocality: COMPANY.locality,
        addressRegion: COMPANY.region,
        postalCode: COMPANY.postalCode,
        addressCountry: "IN",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: COMPANY.phone,
        email: COMPANY.email,
        url: absoluteUrl("/book-demo"),
        availableLanguage: ["English", "Hindi"],
      },
      parentOrganization: { "@type": "Organization", name: COMPANY.name, url: COMPANY.website },
      sameAs: COMPANY.socials.map((social) => social.href),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: BRAND_NAME,
      alternateName: "GreenCall CRM",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "CRM Software",
      operatingSystem: "Web, Android",
      url: absoluteUrl("/"),
      description: homeDescription,
      inLanguage: ["en-IN", "hi-IN"],
      audience: {
        "@type": "Audience",
        audienceType:
          "Small businesses, startups, sales teams, field teams, and local businesses in India",
      },
      featureList: [
        "Lead management and pipeline tracking",
        "Click-to-call and call tracking",
        "WhatsApp messaging",
        "SMS integration",
        "Email integration",
        "Attendance with location capture",
        "Android sales app with offline GPS route tracking",
        "Multi-dashboard system",
        "Sales to legal to finance workflow",
        "Sales team performance tracking",
        "Field sales management",
      ],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description:
          "Free demo available. Affordable pricing for small businesses and startups in India.",
      },
      areaServed: [
        { "@type": "City", name: "Noida" },
        { "@type": "State", name: "Uttar Pradesh" },
        { "@type": "Country", name: "India" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingTrustSection />
        <LandingProblem />
        <LandingFieldApp />
        <LandingFeatureHighlights />
        <LandingWorkflow />
        <LandingUseCases />
        <LandingFaq />
        <LandingDemoCta />
      </main>
      <LandingFooter />
      <FloatingCTA />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
