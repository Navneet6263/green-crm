// Lead source names → brand mark and brand colour. Names are matched loosely, as people type them differently.

const Letter = ({ text, bg, fg = "#fff" }) => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill={bg} />
    <text x="12" y="16.2" textAnchor="middle" fontSize={text.length > 1 ? 10.5 : 13} fontWeight="800" fontFamily="Arial, sans-serif" fill={fg}>{text}</text>
  </svg>
);

const Glyph = ({ bg, children, fg = "#fff" }) => (
  <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill={bg} />
    <g fill="none" stroke={fg} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</g>
  </svg>
);

const MARKS = {
  facebook: () => (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path fill="#fff" d="M13.4 20v-6.3h2.1l.3-2.5h-2.4V9.7c0-.7.2-1.2 1.2-1.2h1.3V6.3c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.8H8.7v2.5h2.1V20h2.6Z" />
    </svg>
  ),
  instagram: () => (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FEDA75" /><stop offset=".35" stopColor="#FA7E1E" /><stop offset=".6" stopColor="#D62976" /><stop offset="1" stopColor="#4F5BD5" /></linearGradient></defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="15.6" cy="8.4" r=".9" fill="#fff" />
    </svg>
  ),
  google: () => (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#fff" stroke="#e2e8f0" />
      <path fill="#4285F4" d="M19 12.2c0-.5 0-1-.1-1.4H12v2.7h3.9a3.4 3.4 0 0 1-1.4 2.2v1.8h2.3c1.4-1.2 2.2-3.1 2.2-5.3Z" />
      <path fill="#34A853" d="M12 19.2c1.9 0 3.6-.6 4.8-1.7l-2.3-1.8c-.6.4-1.5.7-2.5.7-1.9 0-3.5-1.3-4.1-3H5.5v1.9a7.2 7.2 0 0 0 6.5 3.9Z" />
      <path fill="#FBBC05" d="M7.9 13.4a4.3 4.3 0 0 1 0-2.8V8.7H5.5a7.2 7.2 0 0 0 0 6.6l2.4-1.9Z" />
      <path fill="#EA4335" d="M12 7.6c1.1 0 2 .4 2.8 1.1l2.1-2.1A7.2 7.2 0 0 0 5.5 8.7l2.4 1.9c.6-1.7 2.2-3 4.1-3Z" />
    </svg>
  ),
  linkedin: () => (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path fill="#fff" d="M7 10h2.4v7.5H7V10Zm1.2-3.8a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8ZM11 10h2.3v1c.3-.6 1.1-1.2 2.3-1.2 2.4 0 2.9 1.6 2.9 3.7v4H16v-3.6c0-.9 0-2-1.2-2s-1.4.9-1.4 1.9v3.7H11V10Z" />
    </svg>
  ),
  whatsapp: () => (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#25D366" />
      <path fill="none" stroke="#fff" strokeWidth="1.6" d="M6.3 17.7 7 15a6 6 0 1 1 2.2 2.1l-2.9.6Z" />
      <path fill="#fff" d="M10 9.3c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.5 1.3c.1.2 0 .3-.1.5l-.3.4c-.1.1-.2.2 0 .4.4.7 1 1.3 1.8 1.6.2.1.3.1.4 0l.5-.6c.1-.2.3-.2.4-.1l1.3.6c.2.1.3.1.3.3 0 .3-.1.9-.6 1.2-.4.3-1.2.4-2.5-.2a6.6 6.6 0 0 1-2.8-2.6c-.6-1-.6-1.9-.2-2.7Z" />
    </svg>
  ),
  youtube: () => (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path fill="#fff" d="M10 8.8v6.4l5.4-3.2L10 8.8Z" />
    </svg>
  ),
  twitter: () => <Letter text="X" bg="#0f1419" />,
  indiamart: () => <Letter text="IM" bg="#2E3192" />,
  justdial: () => <Letter text="Jd" bg="#FF6F00" />,
  tradeindia: () => <Letter text="TI" bg="#0B4EA2" />,
  website: () => <Glyph bg="#3b6fd8"><circle cx="12" cy="12" r="6.2" /><path d="M5.8 12h12.4M12 5.8c1.8 1.9 2.6 3.9 2.6 6.2s-.8 4.3-2.6 6.2c-1.8-1.9-2.6-3.9-2.6-6.2s.8-4.3 2.6-6.2Z" /></Glyph>,
  referral: () => <Glyph bg="#8a55e6"><circle cx="9" cy="9.5" r="2.4" /><circle cx="15.5" cy="10.5" r="2" /><path d="M5 17.5c.6-2.3 2-3.5 4-3.5s3.4 1.2 4 3.5M13.6 14.4c.6-.3 1.2-.4 1.9-.4 1.6 0 2.8 1 3.3 3" /></Glyph>,
  call: () => <Glyph bg="#009a8c"><path d="M8.2 5.8h-2a.8.8 0 0 0-.8.9 12 12 0 0 0 11.9 11.9.8.8 0 0 0 .9-.8v-2l-2.8-1.1-1.4 1.4a8 8 0 0 1-4-4l1.4-1.4-1.2-2.9Z" /></Glyph>,
  email: () => <Glyph bg="#e06a10"><rect x="5.5" y="7" width="13" height="10" rx="1.6" /><path d="m6 8 6 4.6L18 8" /></Glyph>,
  walkin: () => <Glyph bg="#b98300"><path d="M6 18.5V9l6-3.5L18 9v9.5M10 18.5v-5h4v5" /></Glyph>,
  event: () => <Glyph bg="#d9467c"><rect x="5.5" y="6.5" width="13" height="12" rx="1.6" /><path d="M5.5 10.5h13M9 5v3M15 5v3" /></Glyph>,
  other: () => <Glyph bg="#94a3b8"><circle cx="8" cy="12" r=".6" /><circle cx="12" cy="12" r=".6" /><circle cx="16" cy="12" r=".6" /></Glyph>,
};

// Brand colour for the bars. Logos keep their real colours; bars use a readable version of the same hue.
const BRANDS = [
  [/indiamart|india\s*mart/, "indiamart", "IndiaMART", "#2E3192"],
  [/just\s*dial|^jd$/, "justdial", "Justdial", "#FF6F00"],
  [/trade\s*india/, "tradeindia", "TradeIndia", "#0B4EA2"],
  [/insta|^ig$/, "instagram", "Instagram", "#D62976"],
  [/facebook|^fb$|meta/, "facebook", "Facebook", "#1877F2"],
  [/linked\s*in/, "linkedin", "LinkedIn", "#0A66C2"],
  [/whats\s*app|^wa$/, "whatsapp", "WhatsApp", "#1DA851"],
  [/you\s*tube/, "youtube", "YouTube", "#E00000"],
  [/twitter|^x$/, "twitter", "X (Twitter)", "#0f1419"],
  [/google|adwords|gmb|\bppc\b/, "google", "Google", "#4285F4"],
  [/event|expo|exhibit|seminar|webinar/, "event", "Events", "#d9467c"],
  [/web|site|online|seo|organic/, "website", "Website", "#3b6fd8"],
  [/refer|reference|partner|friend/, "referral", "Referral", "#8a55e6"],
  [/call|tele|phone|cold/, "call", "Calls", "#009a8c"],
  [/mail|newsletter/, "email", "Email", "#e06a10"],
  [/walk|visit|office|direct/, "walkin", "Walk-in", "#b98300"],
];

const titleize = (value) => String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** { label, color, Mark } for a lead source name. */
export function brandFor(name) {
  const raw = String(name || "").trim();
  const key = raw.toLowerCase();
  if (!key || key === "not-set") return { label: "Not set", color: "#94a3b8", Mark: MARKS.other };
  const hit = BRANDS.find(([re]) => re.test(key));
  if (!hit) return { label: titleize(raw), color: "#64748b", Mark: MARKS.other };
  const [, mark, label, color] = hit;
  // Keep the person's own wording when it says more than the brand name, e.g. "Facebook ads".
  const own = titleize(raw);
  return { label: own.toLowerCase().replace(/\s/g, "") === label.toLowerCase().replace(/[\s()-]/g, "") ? label : own, color, Mark: MARKS[mark] };
}

export function SourceMark({ name, className = "h-5 w-5" }) {
  const { Mark } = brandFor(name);
  return <span className={`inline-block shrink-0 overflow-hidden rounded-[6px] ${className}`}><Mark /></span>;
}
