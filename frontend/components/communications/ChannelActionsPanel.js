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

export default function ChannelActionsPanel({ record, capabilities, phoneDrafts, setPhoneDraft, sendChannel, sending }) {
  if (!record) {
    return null;
  }

  const activeDraftChannels = ["whatsapp", "sms"].filter((channel) => capabilities[channel]?.enabled);
  const showCall = capabilities.call?.enabled;

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
        {showCall ? (
          <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
            <p className={KICKER_CLASS}>Call</p>
            <p className="mt-3 text-sm leading-7 text-[#746853]">Uses the resolved tenant or platform call provider selected by backend capabilities.</p>
            <button className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[18px] border border-[#eadfcd] bg-white px-4 py-2.5 text-sm font-semibold text-[#060710] disabled:opacity-60" type="button" onClick={() => sendChannel("call")} disabled={!record.phone || sending === "/communications/call"}>
              <DashboardIcon name="phone" className="h-4 w-4" />
              {sending === "/communications/call" ? "Calling..." : record.phone ? `Call ${record.phone}` : "No phone on file"}
            </button>
          </div>
        ) : null}

        {activeDraftChannels.map((channel) => (
          <div key={channel} className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
            <p className={KICKER_CLASS}>{channel}</p>
            <textarea className={`${INPUT_CLASS} mt-3 min-h-[140px] resize-y`} rows="5" value={phoneDrafts[channel] || ""} onChange={(event) => setPhoneDraft(channel, event.target.value)} placeholder={`Write the ${channel} draft`} />
            <button className={`${PRIMARY_BUTTON_CLASS} mt-4 w-full`} type="button" onClick={() => sendChannel(channel)} disabled={!record.phone || !(phoneDrafts[channel] || "").trim() || sending === `/communications/${channel}`}>
              <DashboardIcon name="message" className="h-4 w-4" />
              {sending === `/communications/${channel}` ? "Sending..." : `Send ${channel === "sms" ? "SMS" : "WhatsApp"}`}
            </button>
          </div>
        ))}

        {!showCall && !activeDraftChannels.length ? (
          <div className="rounded-[24px] border border-dashed border-[#eadfcd] bg-white px-4 py-6 text-sm leading-7 text-[#746853]">
            No call, WhatsApp, or SMS channels are enabled for this company. Capability routing is controlled from backend communication settings.
          </div>
        ) : null}
      </div>
    </article>
  );
}
