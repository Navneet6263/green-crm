import Image from "next/image";

import { BRAND_LOGO, BRAND_NAME, BRAND_TAGLINE } from "./brandConfig";

const SIZE_MAP = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 56,
  xl: 64,
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
  showText = true,
  showTagline = false,
  className = "",
  imageClassName = "",
  textClassName = "",
  nameClassName = "",
  taglineClassName = "",
  priority = false,
}) {
  const dimension = resolveSize(size);

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-[18px] border border-slate-200/70 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.08)]",
          imageClassName
        )}
        style={{ width: dimension, height: dimension }}
      >
        <Image
          src={BRAND_LOGO.src}
          alt={BRAND_LOGO.alt}
          fill
          priority={priority}
          sizes={`${dimension}px`}
          className="object-contain p-[12%]"
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
