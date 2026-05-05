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

export const LEADS_PAGE_SIZE = 12;
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
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-50";
export const LEAD_PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
export const LEAD_GHOST_BUTTON_CLASS =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
export const LEAD_DANGER_BUTTON_CLASS =
  "inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60";
export const LEAD_KICKER_CLASS = "text-[10px] font-bold uppercase tracking-widest text-slate-400";
