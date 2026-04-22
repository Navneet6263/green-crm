const sharedProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export default function LandingIcon({ name, className = "h-5 w-5" }) {
  switch (name) {
    case "layers":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <path d="M12 4 4 8l8 4 8-4-8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 16 8 4 8-4" />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <path d="m12 3 1.8 4.6L18 9.4l-4.2 1.7L12 16l-1.8-4.9L6 9.4l4.2-1.8L12 3Z" />
          <path d="M19 4v3" />
          <path d="M20.5 5.5h-3" />
          <path d="M4 17v4" />
          <path d="M6 19H2" />
        </svg>
      );
    case "path":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <path d="M8.5 6H13a3 3 0 0 1 3 3v6.5" />
          <path d="m15.5 15.5 2.5 2.5" />
        </svg>
      );
    case "pulse":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <path d="M3 12h4l2.2-4.5L13 17l2.2-5H21" />
          <path d="M4 6h16" />
          <path d="M4 18h16" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <path d="M12 3 5 6v5c0 4.7 2.8 8.9 7 10 4.2-1.1 7-5.3 7-10V6l-7-3Z" />
          <path d="m9.5 11.5 1.7 1.7 3.4-3.7" />
        </svg>
      );
    case "grid":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <path d="M4 20V6" />
          <path d="M10 20V10" />
          <path d="M16 20V4" />
          <path d="M22 20V13" />
          <path d="M3 20h18" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...sharedProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2.5" />
        </svg>
      );
  }
}
