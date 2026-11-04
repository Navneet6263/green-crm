"use client";

import { useEffect, useState } from "react";
import { loadSession } from "../../lib/session";

// Minutes before the task. For an "any time" task (stored at midnight), -540 is 9 AM that day.
export const TIMED_REMINDERS = [["none", "No email"], ["0", "At the time"], ["10", "10 min before"], ["30", "30 min before"], ["60", "1 hour before"], ["1440", "1 day before"]];
export const ALL_DAY_REMINDERS = [["none", "No email"], ["-540", "That day, 9 AM"], ["900", "Day before, 9 AM"]];
export const defaultReminder = (allDay) => (allDay ? "-540" : "10");
const MAIL_WINDOW_DAYS = 40;

/** Keeps the choice valid when the task switches between a time and "any time". */
export function fitReminder(value, allDay) {
  const list = allDay ? ALL_DAY_REMINDERS : TIMED_REMINDERS;
  return list.some(([v]) => v === value) ? value : value === "none" ? "none" : defaultReminder(allDay);
}

/** "Email me" choice on a task. The email goes to the person the task is assigned to; a note says when your own email is not verified yet. */
export default function ReminderField({ value, onChange, allDay, assigneeName = "", label = "Email reminder", labelClassName = "text-[12px] font-semibold text-slate-600" }) {
  const [user, setUser] = useState(null);
  useEffect(() => { setUser(loadSession()?.user || null); }, []);
  const at = user?.email_verified_at ? new Date(user.email_verified_at).getTime() : 0;
  const verified = at && Date.now() - at <= MAIL_WINDOW_DAYS * 86400000;
  const list = allDay ? ALL_DAY_REMINDERS : TIMED_REMINDERS;

  return (
    <div>
      <p className={labelClassName}>{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {list.map(([v, text]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={`rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold ring-1 transition ${value === v ? "bg-brand-50 text-brand-800 ring-brand-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{text}</button>
        ))}
      </div>
      {value !== "none" && assigneeName ? <p className="mt-1.5 text-[11.5px] text-slate-500">Goes to {assigneeName}, if their email is verified</p> : null}
      {value !== "none" && user && !assigneeName ? (
        verified
          ? <p className="mt-1.5 text-[11.5px] text-slate-500">Goes to {user.email}</p>
          : <p className="mt-1.5 rounded-[8px] bg-amber-50 px-2.5 py-1.5 text-[11.5px] text-amber-800 ring-1 ring-amber-100">Your email is not verified yet, so no email will go. Sign out, sign in again and enter the code we email you.</p>
      ) : null}
    </div>
  );
}
