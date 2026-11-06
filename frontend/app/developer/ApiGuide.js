"use client";

import { useState } from "react";
import { CodeBlock, CopyField, D, Tabs, apiRoot } from "./dev-ui";
import { ENDPOINTS, ERRORS, FIELDS, RESPONSE, SMART, samples, syncSample } from "./apiExamples";

const METHOD_TONE = {
  GET: "bg-blue-50 text-blue-700 ring-blue-100",
  POST: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  PATCH: "bg-amber-50 text-amber-800 ring-amber-100",
};

function Section({ title, text, children }) {
  return (
    <section className={`${D.panel} p-4`}>
      <p className="text-[14px] font-bold text-slate-900">{title}</p>
      {text ? <p className="mt-0.5 text-[12.5px] text-slate-500">{text}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The API reference the admin can hand to a developer. */
export default function ApiGuide({ onNewKey }) {
  const root = apiRoot();
  const code = [...samples(root), ["Sync & retry", syncSample(root)]];
  const [lang, setLang] = useState("0");

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <Section title="1. Address and key" text="Every request goes to this address and carries your API key.">
          <CopyField value={root} />
          <div className="mt-3 space-y-2 text-[12.5px] text-slate-600">
            <p>Send the key in a header: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">Authorization: Bearer gcrm_…</code> (or <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">X-API-Key: gcrm_…</code>).</p>
            <p>Use the key only from a server. Anyone who sees it can read your leads, so never put it in website code that runs in the visitor&apos;s browser. For website forms, use a lead link instead.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={D.small} onClick={onNewKey}>Make an API key</button>
              <a className={D.small} href={root + "/openapi.json"} target="_blank" rel="noreferrer">OpenAPI file</a>
            </div>
          </div>
        </Section>

        <Section title="2. Endpoints" text="All answers are JSON: { success, data, meta } or { success: false, error, code }.">
          <ul className="divide-y divide-slate-100">
            {ENDPOINTS.map((e) => (
              <li key={`${e.method}${e.path}`} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-[6px] px-1.5 py-0.5 font-mono text-[11px] font-bold ring-1 ${METHOD_TONE[e.method]}`}>{e.method}</span>
                  <code className="font-mono text-[12.5px] font-semibold text-slate-900">{e.path}</code>
                  {e.scope ? <span className="ml-auto text-[11px] font-semibold text-slate-400">{e.scope}</span> : null}
                </div>
                <p className="mt-1 text-[12.5px] text-slate-600">{e.text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="3. Built-in safety" text="Use these and your integration keeps working even when networks fail.">
          <ul className="space-y-2.5">
            {SMART.map(([title, text]) => (
              <li key={title} className="flex gap-2.5 text-[12.5px]">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                <span><span className="font-semibold text-slate-900">{title}. </span><span className="text-slate-600">{text}</span></span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="4. Lead fields" text="Send these names when you create or update a lead. Unknown names are refused, so typos show up at once.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[12.5px]">
              <tbody className="divide-y divide-slate-100">
                {FIELDS.map(([name, type, text]) => (
                  <tr key={name}><td className="py-2 pr-3 align-top"><code className="font-mono text-[12px] font-semibold text-slate-900">{name}</code></td><td className="py-2 pr-3 align-top text-slate-400">{type}</td><td className="py-2 text-slate-600">{text}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div className="min-w-0 space-y-4">
        <Section title="Examples" text="Copy, put your key in place of gcrm_YOUR_KEY, and run.">
          <Tabs items={code.map(([label], i) => [String(i), label])} value={lang} onChange={setLang} size="sm" />
          <div className="mt-3"><CodeBlock title={code[Number(lang)][0]} code={code[Number(lang)][1]} /></div>
        </Section>
        <Section title="A lead in the answer">
          <CodeBlock title="200 OK" code={RESPONSE} />
        </Section>
        <Section title="Errors and limits">
          <ul className="space-y-2 text-[12.5px]">
            {ERRORS.map(([code, text]) => (
              <li key={code} className="flex gap-3"><span className="w-10 shrink-0 font-mono font-bold text-slate-900">{code}</span><span className="text-slate-600">{text}</span></li>
            ))}
          </ul>
          <p className="mt-3 rounded-[10px] bg-slate-50 px-3 py-2 text-[12px] text-slate-500 ring-1 ring-slate-100">Every call is listed in Activity for 30 days, with its result and time taken.</p>
        </Section>
      </div>
    </div>
  );
}
