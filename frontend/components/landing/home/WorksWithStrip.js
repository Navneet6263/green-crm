// Tools GreenCRM connects to today (telephony/messaging providers, email, maps, import/export).
const TOOLS = [
  { name: "WhatsApp", color: "text-[#25D366]" },
  { name: "Exotel", color: "text-[#1a5cff]" },
  { name: "Twilio", color: "text-[#f22f46]" },
  { name: "Email / SMTP", color: "text-slate-700" },
  { name: "Google Maps", color: "text-[#4285f4]" },
  { name: "Excel & CSV", color: "text-[#217346]" },
  { name: "Android", color: "text-[#3ddc84]" },
];

export default function WorksWithStrip() {
  return (
    <section className="border-y border-slate-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Works with the tools your team already uses</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {TOOLS.map((t) => (
            <span key={t.name} className={`text-lg font-extrabold tracking-tight opacity-75 transition hover:opacity-100 ${t.color}`}>
              {t.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
