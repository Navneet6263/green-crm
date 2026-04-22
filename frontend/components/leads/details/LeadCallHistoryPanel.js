"use client";

import { API_BASE } from "../../../lib/api";

function nice(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function when(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";
}

function durationText(value) {
  const total = Number(value || 0);
  if (!Number.isFinite(total) || total <= 0) return "--";
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function mediaUrl(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `${API_BASE}${value}`;
}

export default function LeadCallHistoryPanel({ calls, panelClass, kickerClass }) {
  return (
    <article className={panelClass}>
      <div className="mb-5">
        <span className={kickerClass}>Call History</span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Calls and recordings</h2>
      </div>

      <div className="space-y-3">
        {calls.length ? calls.map((call) => (
          <div key={call.call_log_id} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                    {nice(call.status || "initiated")}
                  </span>
                  <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
                    {call.provider || "Provider"}
                  </span>
                </div>
                <p className="text-sm leading-7 text-[#5f533f]">
                  {call.from_number || "--"} to {call.to_number || "--"}
                </p>
                <p className="text-xs font-medium text-[#7a6b57]">
                  Duration: {durationText(call.duration_seconds)} | Started: {when(call.started_at || call.created_at)}
                </p>
              </div>

              <div className="w-full max-w-[320px] space-y-3">
                {call.recording_url ? (
                  <>
                    <audio className="w-full" controls preload="none" src={mediaUrl(call.recording_url)}>
                      Your browser does not support audio playback.
                    </audio>
                    <a className="inline-flex text-sm font-semibold text-[#8d6e27]" href={mediaUrl(call.recording_url)} target="_blank" rel="noreferrer">
                      Open recording
                    </a>
                  </>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#ddd0bb] bg-white px-4 py-4 text-sm text-[#7a6b57]">
                    Recording not available for this call yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )) : (
          <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">
            No CRM call logs have been recorded for this lead yet.
          </p>
        )}
      </div>
    </article>
  );
}
