import { sectionPadding, sectionTitle, sectionSub } from "./landing-styles";

const TESTIMONIALS = [
  { name: "Rajesh S.", role: "Sales Head", company: "IT Solutions, Noida", text: "Before GreenCRM, we were losing 40% of leads in Excel sheets. Now every follow-up is tracked and our conversion rate doubled in 3 months.", stars: 5 },
  { name: "Priya M.", role: "Founder", company: "Interior Design Studio, Delhi", text: "My team of 8 sales reps now manages 500+ leads without missing a single callback. The WhatsApp integration is a game-changer.", stars: 5 },
  { name: "Amit V.", role: "Business Owner", company: "IT Services, Gurugram", text: "Simple, fast, and affordable. We switched from Zoho because GreenCRM is built for how Indian sales teams actually work.", stars: 5 },
  { name: "Sneha P.", role: "Operations Manager", company: "Marketing Agency, Mumbai", text: "The attendance tracking with geo-fencing solved our field team management problem completely. Highly recommended for growing teams.", stars: 5 },
];

function Stars({ count }) {
  return <div className="flex gap-0.5">{Array.from({ length: count }, (_, i) => <span key={i} className="text-amber-400">★</span>)}</div>;
}

export default function LandingTestimonials() {
  return (
    <section className={sectionPadding}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-600">Testimonials</p>
          <h2 className={`${sectionTitle} mt-2`}>Trusted by growing businesses across India</h2>
          <p className={`${sectionSub} mx-auto`}>Real feedback from real teams using GreenCRM every day.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md">
              <Stars count={t.stars} />
              <p className="mt-4 text-sm leading-relaxed text-slate-600">"{t.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">{t.name[0]}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}, {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
