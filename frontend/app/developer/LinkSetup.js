"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SideDrawer from "../../components/ui/SideDrawer";
import { CodeBlock, CopyField, D, Notice, Tabs, captureUrl, sourceLabel } from "./dev-ui";
import { GUIDES } from "./linkSnippets";

/** How to use one lead link: the secret address, set-up steps per platform, and a test lead. */
export default function LinkSetup({ link, onClose, onChanged }) {
  const [guide, setGuide] = useState("website");
  const [sample, setSample] = useState(0);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setGuide(link?.lead_source === "facebook" || link?.lead_source === "instagram" ? "facebook" : link?.lead_source === "google" ? "google" : ["indiamart", "justdial"].includes(link?.lead_source) ? "indiamart" : "website");
    setSample(0);
    setNotice(null);
  }, [link]);

  if (!link) return null;
  const url = captureUrl(link.token);
  const current = GUIDES.find((g) => g.key === guide) || GUIDES[0];

  async function sendTest() {
    setTesting(true);
    setNotice(null);
    try {
      const phone = `9${String(Date.now()).slice(-9)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test lead", phone, email: `test.lead.${phone}@example.com`, message: "Test sent from the Developer page", is_test: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The test lead did not go through.");
      setNotice({ tone: "success", text: "Test lead created. Open it from Activity, and delete it when you are done.", leadId: body.data?.lead_id });
      onChanged?.();
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <SideDrawer open={Boolean(link)} onClose={onClose} width="max-w-[720px]" title={`Set up: ${link.name}`} subtitle={`${sourceLabel(link.lead_source)} · ${link.product_name || "Product"} · ${link.owner_ids.length > 1 ? `round robin to ${link.owner_ids.length} people` : link.owner_ids.length ? "one owner" : "leads come to you"}`}>
      <div className="space-y-4">
        <section className={`${D.panel} space-y-3 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13.5px] font-bold text-slate-900">Your lead link</p>
            {!link.is_active ? <span className="text-[12px] font-semibold text-amber-700">This link is off. Turn it on to receive leads.</span> : null}
          </div>
          <CopyField value={url} />
          <p className="text-[12px] text-slate-500">Keep it private: anyone with this link can send leads. If it leaks, make a new link from the list and update your forms.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={D.primary} disabled={testing || !link.is_active} onClick={sendTest}>{testing ? "Sending…" : "Send a test lead"}</button>
            <span className="text-[11.5px] text-slate-400">Creates a real lead named “Test lead”.</span>
          </div>
          <Notice notice={notice} onClose={() => setNotice(null)} />
          {notice?.leadId ? <Link href={`/leads/${notice.leadId}`} className="inline-block text-[12.5px] font-semibold text-brand-700 hover:underline">Open the test lead →</Link> : null}
        </section>

        <Tabs items={GUIDES.map((g) => [g.key, g.label])} value={guide} onChange={(key) => { setGuide(key); setSample(0); }} size="sm" />

        <section className={`${D.panel} space-y-3 p-4`}>
          <p className="text-[13px] leading-relaxed text-slate-600">{current.intro}</p>
          {current.steps ? (
            <ol className="space-y-2">
              {current.steps.map((step, i) => (
                <li key={step} className="flex gap-2.5 text-[13px] text-slate-700">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-800 ring-1 ring-brand-100">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {current.code ? (
            <div className="space-y-2">
              {current.code.length > 1 ? <Tabs items={current.code.map(([label], i) => [String(i), label])} value={String(sample)} onChange={(v) => setSample(Number(v))} size="sm" /> : null}
              <CodeBlock title={current.code[sample]?.[0]} code={current.code[sample]?.[1](url)} />
            </div>
          ) : null}
        </section>

        <section className={`${D.soft} p-4 text-[12.5px] text-slate-600`}>
          <p className="font-semibold text-slate-800">What happens to each lead</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>A new person becomes a lead with status New, source {sourceLabel(link.lead_source)}, and gets an owner. The owner sees a notification.</li>
            <li>If the phone or email is already in your CRM, no copy is made. The old lead gets a note that they asked again.</li>
            <li>Every request, good or failed, is listed in Activity for 30 days.</li>
          </ul>
        </section>
      </div>
    </SideDrawer>
  );
}
