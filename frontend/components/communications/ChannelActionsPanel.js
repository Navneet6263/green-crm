import DashboardIcon from "../dashboard/icons";

import {
  INPUT_CLASS,
  KICKER_CLASS,
  PANEL_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "./constants";

function CapabilityBadge({ capability, label }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold ${capability?.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[#eadfcd] bg-white text-[#7c6d55]"}`}>
      {label}: {capability?.enabled ? capability.provider || "enabled" : "disabled"}
    </span>
  );
}

function formatReason(reason) {
  return String(reason || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function describeCapability(channel, capability) {
  if (capability?.enabled) {
    return capability.source === "platform"
      ? "Uses the superadmin-approved GreenCRM service after backend fallback resolution."
      : "Uses the company's own provider credentials.";
  }

  return `Visible for discovery. This action will be blocked until own ${channel} credentials are configured or a superadmin enables the platform service.${capability?.reason ? ` Reason: ${formatReason(capability.reason)}.` : ""}`;
}

export default function ChannelActionsPanel({ record, capabilities, phoneDrafts, setPhoneDraft, sendChannel, sending }) {
  if (!record) {
    return null;
  }

  const channels = ["call", "whatsapp", "sms"];

  return (
    <article className={PANEL_CLASS}>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className={KICKER_CLASS}>Channels</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Provider-backed actions</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <CapabilityBadge capability={capabilities.call} label="Call" />
          <CapabilityBadge capability={capabilities.whatsapp} label="WhatsApp" />
          <CapabilityBadge capability={capabilities.sms} label="SMS" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {channels.map((channel) => (
          <div key={channel} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
            <p className={KICKER_CLASS}>{channel}</p>
            <p className="mt-3 text-sm leading-7 text-[#746853]">{describeCapability(channel, capabilities[channel])}</p>
            {channel === "call" ? null : (
              <textarea
                className={`${INPUT_CLASS} mt-3 min-h-[140px] resize-y`}
                rows="5"
                value={phoneDrafts[channel] || ""}
                onChange={(event) => setPhoneDraft(channel, event.target.value)}
                placeholder={`Write the ${channel} draft`}
              />
            )}
            <button
              className={`${channel === "call" ? "mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#060710] disabled:opacity-60" : `${PRIMARY_BUTTON_CLASS} mt-4 w-full`}`}
              type="button"
              onClick={() => sendChannel(channel)}
              disabled={!record.phone || (channel !== "call" && !(phoneDrafts[channel] || "").trim()) || sending === `/communications/${channel}`}
            >
              <DashboardIcon name={channel === "call" ? "phone" : "message"} className="h-4 w-4" />
              {sending === `/communications/${channel}`
                ? channel === "call"
                  ? "Calling..."
                  : "Sending..."
                : channel === "call"
                  ? record.phone
                    ? `Call ${record.phone}`
                    : "No phone on file"
                  : `Send ${channel === "sms" ? "SMS" : "WhatsApp"}`}
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}
