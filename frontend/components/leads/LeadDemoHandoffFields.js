"use client";

const INPUT = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const LABEL = "text-[12px] font-semibold text-slate-600";

export default function LeadDemoHandoffFields({ assigneeOptions = [], demo, setDemo }) {
  return (
    <div className="mt-4 rounded-[14px] bg-violet-50/60 p-4 ring-1 ring-violet-100">
      <div className="mb-4">
        <span className="text-[13px] font-bold text-violet-900">Demo handoff</span>
        <p className="mt-0.5 text-[12.5px] text-violet-800">Capture requirement, demo slot, and new owner before booking the demo.</p>
      </div>

      <label className="block space-y-2">
        <span className={LABEL}>Requirement *</span>
        <textarea
          className={`${INPUT} min-h-[112px] resize-y`}
          placeholder="Customer requirement / what demo is needed?"
          value={demo.requirement}
          onChange={(event) => setDemo((current) => ({ ...current, requirement: event.target.value }))}
          rows="3"
        />
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-2">
          <span className={LABEL}>Demo date *</span>
          <input className={INPUT} type="date" value={demo.date} onChange={(event) => setDemo((current) => ({ ...current, date: event.target.value }))} />
        </label>
        <label className="space-y-2">
          <span className={LABEL}>Demo time *</span>
          <input className={INPUT} type="time" value={demo.time} onChange={(event) => setDemo((current) => ({ ...current, time: event.target.value }))} />
        </label>
      </div>

      <label className="mt-4 block space-y-2">
        <span className={LABEL}>Assign to team/user *</span>
        <select className={INPUT} value={demo.assignee} onChange={(event) => setDemo((current) => ({ ...current, assignee: event.target.value }))}>
          <option value="">Select assignee</option>
          {assigneeOptions.map((user) => <option key={user.user_id} value={user.user_id}>{user.name} | {user.role}</option>)}
        </select>
      </label>

      <label className="mt-4 block space-y-2">
        <span className={LABEL}>Optional note</span>
        <textarea
          className={`${INPUT} min-h-[88px] resize-y`}
          value={demo.note}
          onChange={(event) => setDemo((current) => ({ ...current, note: event.target.value }))}
          placeholder="Any internal context for the demo owner"
          rows="2"
        />
      </label>
    </div>
  );
}
