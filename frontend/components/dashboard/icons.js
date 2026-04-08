"use client";

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="11" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="16" width="7" height="5" rx="2" />
    </>
  ),
  company: (
    <>
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M9 21v-4h6v4" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </>
  ),
  users: (
    <>
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M16 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M3.5 20a4.5 4.5 0 0 1 9 0" />
      <path d="M13.5 20a3.5 3.5 0 0 1 7 0" />
    </>
  ),
  leads: (
    <>
      <circle cx="11" cy="11" r="7" />
      <circle cx="11" cy="11" r="3" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  customers: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4 20a8 8 0 0 1 16 0" />
      <path d="m18.5 5 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L15.5 7.3l2-.3 1-2Z" />
    </>
  ),
  products: (
    <>
      <path d="M12 3 4 7l8 4 8-4-8-4Z" />
      <path d="M4 7v10l8 4 8-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20v-11" />
    </>
  ),
  tasks: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 9 2 2 4-4" />
      <path d="m8 15 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h4" />
      <path d="M14 14h2" />
    </>
  ),
  message: (
    <>
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H10l-5 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </>
  ),
  workflow: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.5 7.5 15.5 10.5" />
      <path d="M8.5 16.5 15.5 13.5" />
    </>
  ),
  support: (
    <>
      <path d="M5 12a7 7 0 0 1 14 0" />
      <path d="M5 12v3a2 2 0 0 0 2 2h2v-5H7a2 2 0 0 0-2 2Z" />
      <path d="M19 12v3a2 2 0 0 1-2 2h-2v-5h2a2 2 0 0 1 2 2Z" />
      <path d="M9 18a3 3 0 0 0 6 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="m4.9 4.9 2.1 2.1" />
      <path d="m17 17 2.1 2.1" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 19.1 2.1-2.1" />
      <path d="m17 7 2.1-2.1" />
    </>
  ),
  performance: (
    <>
      <path d="M4 19h16" />
      <path d="M7 19v-5" />
      <path d="M12 19V9" />
      <path d="M17 19v-8" />
      <path d="m6 10 4-3 3 2 5-4" />
    </>
  ),
  security: (
    <>
      <path d="M12 3 5 6v6c0 4.4 2.8 7.7 7 9 4.2-1.3 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  documents: (
    <>
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
  finance: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M7 10h.01" />
      <path d="M17 14h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M12 4a4 4 0 0 0-4 4v2.2c0 .8-.2 1.6-.6 2.3L6 15h12l-1.4-2.5a4.8 4.8 0 0 1-.6-2.3V8a4 4 0 0 0-4-4Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </>
  ),
  audit: (
    <>
      <path d="M4 12h3l2-4 4 8 2-4h5" />
      <path d="M5 5h14" />
      <path d="M5 19h14" />
    </>
  ),
  demo: (
    <>
      <path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
      <path d="m19 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z" />
    </>
  ),
  user: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
};

export default function DashboardIcon({ name = "dashboard", className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name] || ICONS.dashboard}
    </svg>
  );
}
