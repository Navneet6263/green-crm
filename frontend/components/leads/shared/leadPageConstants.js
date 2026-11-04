"use client";

import { LEAD_STATUS_ACCENTS } from "../../../lib/leadStatus";

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

export const LEADS_PAGE_SIZE = 25;
export const LEAD_BACKGROUND_BATCH_SIZE = 120;
export const LEAD_BACKGROUND_BATCH_DELAY_MS = 80;
export const LEAD_EXPORT_PAGE_SIZE = 1000;

export const STATUS_TONE = LEAD_STATUS_ACCENTS;

export const PRIORITY_TONE = {
  low: ["rgba(56,189,248,.12)", "#0077b8"],
  medium: ["rgba(245,164,45,.14)", "#b96a00"],
  high: ["rgba(255,108,156,.14)", "#c4356b"],
  urgent: ["rgba(224,82,82,.14)", "#b63b3b"],
};

export const LEAD_PANEL_CLASS =
  "rounded-2xl border border-slate-100 bg-white shadow-sm";
export const LEAD_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-50";
export const LEAD_PRIMARY_BUTTON_CLASS =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50";
export const LEAD_GHOST_BUTTON_CLASS =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
export const LEAD_DANGER_BUTTON_CLASS =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-[10px] bg-rose-50 px-3 text-[13px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50";
export const LEAD_KICKER_CLASS = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
