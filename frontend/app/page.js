import LandingDemoCta from "../components/landing/LandingDemoCta";
import LandingFeatureHighlights from "../components/landing/LandingFeatureHighlights";
import LandingFooter from "../components/landing/LandingFooter";
import LandingHero from "../components/landing/LandingHero";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingTrustSection from "../components/landing/LandingTrustSection";
import LandingWorkflow from "../components/landing/LandingWorkflow";
import { absoluteUrl, buildMetadata } from "../lib/seo";

export const metadata = buildMetadata({
  title: "Modern CRM For Leads, Workflow Handoffs, and Team Execution",
  description:
    "GreenCRM is a modern CRM for lead operations, role-based workflows, customer continuity, and calm team execution across every handoff.",
  path: "/",
});

export default function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "GreenCRM",
      url: absoluteUrl("/"),
      logo: absoluteUrl("/icon.svg"),
      description:
        "GreenCRM is a modern CRM for lead operations, customer continuity, workflow handoffs, reminders, and team coordination.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "GreenCRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/"),
      description:
        "GreenCRM helps businesses manage leads, customers, workflow queues, tasks, reminders, and role-based operations in one workspace.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatureHighlights />
        <LandingWorkflow />
        <LandingTrustSection />
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
