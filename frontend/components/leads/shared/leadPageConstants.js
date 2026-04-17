"use client";

export const OK_ROLES = [
  "super-admin",
  "platform-admin",
  "platform-manager",
  "admin",
  "manager",
  "sales",
  "marketing",
  "viewer",
];

export const MANAGER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager"];
export const CREATE_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales", "marketing"];
export const LEGAL_TRANSFER_ROLES = ["super-admin", "platform-admin", "platform-manager", "admin", "manager", "sales"];

export const LEADS_PAGE_SIZE = 12;
export const LEAD_BACKGROUND_BATCH_SIZE = 120;
export const LEAD_BACKGROUND_BATCH_DELAY_MS = 80;
export const LEAD_EXPORT_PAGE_SIZE = 1000;

export const STATUS_TONE = {
  new: ["rgba(79,140,255,.12)", "#2f6fdd"],
  contacted: ["rgba(56,189,248,.14)", "#0077b8"],
  qualified: ["rgba(167,139,250,.14)", "#6d46d6"],
  proposal: ["rgba(245,164,45,.14)", "#b96a00"],
  negotiation: ["rgba(251,146,60,.14)", "#c96200"],
  "closed-won": ["rgba(31,199,120,.16)", "#0f8c53"],
  "closed-lost": ["rgba(224,82,82,.14)", "#b63b3b"],
  pending: ["rgba(245,164,45,.14)", "#b96a00"],
};

export const PRIORITY_TONE = {
  low: ["rgba(56,189,248,.12)", "#0077b8"],
  medium: ["rgba(245,164,45,.14)", "#b96a00"],
  high: ["rgba(255,108,156,.14)", "#c4356b"],
  urgent: ["rgba(224,82,82,.14)", "#b63b3b"],
};

export const LEAD_PANEL_CLASS =
  "rounded-[30px] border border-[#eadfcd] bg-white/82 shadow-[0_14px_36px_rgba(79,58,22,0.06)]";
export const LEAD_INPUT_CLASS =
  "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
export const LEAD_PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
export const LEAD_GHOST_BUTTON_CLASS =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#5d503c] transition hover:-translate-y-0.5 hover:text-[#060710] disabled:cursor-not-allowed disabled:opacity-60";
export const LEAD_DANGER_BUTTON_CLASS =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
export const LEAD_KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";
