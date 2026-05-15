import LandingDemoCta from "../components/landing/LandingDemoCta";
import LandingFeatureHighlights from "../components/landing/LandingFeatureHighlights";
import LandingFooter from "../components/landing/LandingFooter";
import LandingHero from "../components/landing/LandingHero";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingProblem from "../components/landing/LandingProblem";
import LandingTestimonials from "../components/landing/LandingTestimonials";
import LandingTrustSection from "../components/landing/LandingTrustSection";
import LandingUseCases from "../components/landing/LandingUseCases";
import LandingWorkflow from "../components/landing/LandingWorkflow";
import { BRAND_ICONS, BRAND_NAME } from "../components/branding/brandConfig";
import { absoluteUrl, buildMetadata } from "../lib/seo";

const homeDescription =
  "GreenCRM is the best CRM software in Noida and India for small businesses, startups, and sales teams. Manage leads, calls, WhatsApp, SMS, attendance, and dashboards in one affordable CRM. Book a free demo today.";

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
    "CRM with geo fencing",
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
        addressLocality: "Noida",
        addressRegion: "Uttar Pradesh",
        addressCountry: "IN",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        url: absoluteUrl("/book-demo"),
        availableLanguage: ["English", "Hindi"],
      },
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: BRAND_NAME,
      alternateName: "GreenCall CRM",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "CRM Software",
      operatingSystem: "Web",
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
        "WhatsApp messaging and automation",
        "SMS integration",
        "Email integration",
        "Attendance with geo fencing",
        "Multi-dashboard system",
        "CRM automation",
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
      mainEntity: [
        {
          "@type": "Question",
          name: "What is GreenCRM?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "GreenCRM is an affordable CRM software in India built for small businesses, startups, and sales teams. It combines lead management, calling, WhatsApp, SMS, attendance, and dashboards in one workspace.",
          },
        },
        {
          "@type": "Question",
          name: "Is GreenCRM available in Noida?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Yes. GreenCRM is a CRM company based in Noida and serves businesses across India. You can book a free demo to see how it fits your team.",
          },
        },
        {
          "@type": "Question",
          name: "Does GreenCRM support WhatsApp and calling?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Yes. GreenCRM includes CRM with calling (click-to-call), WhatsApp integration, and SMS integration so your sales team can follow up from one place.",
          },
        },
        {
          "@type": "Question",
          name: "Is GreenCRM good for small businesses?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "GreenCRM is designed as an affordable CRM for small businesses and startups in India. It is simple, fast, and includes all features a growing sales team needs.",
          },
        },
        {
          "@type": "Question",
          name: "Does GreenCRM have geo fencing and attendance?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Yes. GreenCRM includes an attendance system with geo fencing for field sales teams, so managers can track check-in, check-out, and field movement.",
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingTrustSection />
        <LandingProblem />
        <LandingFeatureHighlights />
        <LandingWorkflow />
        <LandingTestimonials />
        <LandingUseCases />
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
