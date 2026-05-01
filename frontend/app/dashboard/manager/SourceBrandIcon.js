"use client";

export default function SourceBrandIcon({ source }) {
  const key = String(source || "").toLowerCase();

  if (key === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="manager-ig" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="65%" stopColor="#d6249f" />
            <stop offset="100%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#manager-ig)" />
        <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.6" r="1.2" fill="white" />
      </svg>
    );
  }

  if (key === "facebook") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#1877F2" />
        <path d="M13.4 8h-1.1c-.5 0-.8.4-.8.9V10H13l-.3 2h-1.2v5h-2v-5H8v-2h1.5V8.8C9.5 7.3 10.5 6 12 6c.6 0 1.4.1 1.4.1V8z" fill="white" />
      </svg>
    );
  }

  if (key === "google") {
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-sm font-black text-blue-600 ring-1 ring-slate-200">
        G
      </span>
    );
  }

  if (key === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#0A66C2" />
        <path d="M7 10h2v7H7v-7zm1-3a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 8 7zm4 3h2v1c.4-.7 1.2-1.2 2.2-1.2 2 0 2.8 1.3 2.8 3.2V17h-2v-3.5c0-1-.4-1.5-1.2-1.5-.9 0-1.8.6-1.8 1.8V17h-2v-7z" fill="white" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#3B82F6" strokeWidth="1.8" />
      <path d="M3 12h18M12 3c-2.4 3-3.6 6-3.6 9s1.2 6 3.6 9M12 3c2.4 3 3.6 6 3.6 9s-1.2 6-3.6 9" stroke="#3B82F6" strokeWidth="1.4" />
    </svg>
  );
}
