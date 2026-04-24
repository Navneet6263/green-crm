import Image from "next/image";

import { BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from "./brandConfig";

const SIZE_MAP = {
  xs: 104,
  sm: 128,
  md: 156,
  lg: 184,
  xl: 220,
};

const VARIANT_MAP = {
  default: {
    frame: "px-0.5 py-0.5",
    logo: "",
  },
  landing: {
    frame: "px-1 py-1",
    logo: "drop-shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
  },
  auth: {
    frame: "px-1 py-1",
    logo: "drop-shadow-[0_8px_18px_rgba(79,58,22,0.08)]",
  },
  sidebar: {
    frame: "px-1.5 py-1",
    logo: "drop-shadow-[0_12px_24px_rgba(79,58,22,0.08)]",
  },
  footer: {
    frame: "px-1 py-0.5",
    logo: "drop-shadow-[0_8px_18px_rgba(15,23,42,0.06)]",
  },
};

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

function resolveSize(size) {
  if (typeof size === "number") {
    return size;
  }

  return SIZE_MAP[size] || SIZE_MAP.md;
}

export default function AppLogo({
  size = "md",
  variant = "default",
  showText = false,
  showTagline = false,
  className = "",
  imageClassName = "",
  logoClassName = "",
  textClassName = "",
  nameClassName = "",
  taglineClassName = "",
  priority = false,
}) {
  const width = resolveSize(size);
  const sizes = `(max-width: 640px) ${Math.max(Math.round(width * 0.8), 72)}px, ${width}px`;
  const variantStyle = VARIANT_MAP[variant] || VARIANT_MAP.default;

  return (
    <div className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <span
        className={cn(
          "block max-w-full shrink-0",
          variantStyle.frame,
          imageClassName
        )}
        style={{ width, maxWidth: "100%" }}
      >
        <Image
          src={BRAND_LOGO.src}
          alt={BRAND_LOGO.alt}
          width={BRAND_LOGO.width}
          height={BRAND_LOGO.height}
          priority={priority}
          unoptimized
          sizes={sizes}
          className={cn(
            "h-auto w-full max-w-full object-contain",
            variantStyle.logo,
            logoClassName
          )}
        />
      </span>

      {showText ? (
        <span className={cn("min-w-0", textClassName)}>
          <span className={cn("block text-base font-semibold tracking-[0.08em] text-slate-950", nameClassName)}>{BRAND_NAME}</span>
          {showTagline ? (
            <span className={cn("block text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500", taglineClassName)}>{BRAND_TAGLINE}</span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
