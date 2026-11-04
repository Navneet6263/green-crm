"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, apiRequest } from "../../../lib/api";
import { loadProductsForScope, loadTeamsForCompany, loadUsersForScope, teamSelectLabel } from "../../../lib/teamScope";
import { IMPORT_FIELDS, autoMatchColumns, buildImportRow, toCsv } from "./leadImportFields";

const STEPS = ["Upload", "Match columns", "Review", "Done"];
const CHECK_BATCH = 200;
const SAVE_BATCH = 50;
const SELECT = "h-9 w-full rounded-[10px] border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-brand-400";
const PRIMARY = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-brand-700 px-5 text-[13.5px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50";
const GHOST = "inline-flex h-10 items-center justify-center gap-2 rounded-[10px] bg-white px-4 text-[13.5px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50";
const STATUS = {
  ok: ["Ready", "bg-emerald-50 text-emerald-800"],
  duplicate: ["Already exists", "bg-amber-50 text-amber-800"],
  error: ["Needs fixing", "bg-rose-50 text-rose-700"],
};

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stepper({ step }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {STEPS.map((name, index) => (
        <li key={name} className="flex items-center gap-1.5" aria-current={index === step ? "step" : undefined}>
          <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${index < step ? "bg-brand-100 text-brand-800" : index === step ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-400"}`}>{index < step ? "✓" : index + 1}</span>
          <span className={`hidden text-[12.5px] font-semibold sm:inline ${index === step ? "text-slate-900" : "text-slate-400"}`}>{name}</span>
          {index < STEPS.length - 1 ? <span className="mx-0.5 h-px w-4 bg-slate-200" /> : null}
        </li>
      ))}
    </ol>
  );
}

/** Bulk upload as a window over the Leads list: upload, match columns, review, import. */
export default function LeadImportModal({ open, onClose, onImported, token, session, companies = [], isPlatformConsole, canAssign }) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState(null);
  const [map, setMap] = useState({});
  const [paste, setPaste] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [teams, setTeams] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [defaults, setDefaults] = useState({ team_id: "", product_id: "", assigned_to: "", lead_source: "other" });
  const [review, setReview] = useState([]);
  const [filter, setFilter] = useState("all");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const reset = useCallback(() => {
    setStep(0); setFileName(""); setTable(null); setMap({}); setPaste(""); setBusy(""); setProgress(0); setError(""); setReview([]); setFilter("all"); setResult(null);
    setDefaults({ team_id: "", product_id: "", assigned_to: "", lead_source: "other" });
  }, []);
  const hasWork = Boolean(table) && step < 3;
  const close = useCallback(() => {
    if (busy) return;
    if (hasWork && !window.confirm("Close and discard this upload? Nothing has been saved yet.")) return;
    if (result?.imported) onImported?.();
    reset();
    onClose();
  }, [busy, hasWork, result, onImported, reset, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const scopeCompany = isPlatformConsole ? companyId : session?.user?.company_id || session?.company?.company_id || "";
  useEffect(() => {
    if (!open || !token || !scopeCompany) return;
    loadTeamsForCompany(token, scopeCompany).then(setTeams).catch(() => setTeams([]));
  }, [open, token, scopeCompany]);
  useEffect(() => {
    if (!open || !token || !scopeCompany) return;
    loadProductsForScope(token, { companyId: scopeCompany, teamId: defaults.team_id, pageSize: 100 }).then(setProducts).catch(() => setProducts([]));
    if (canAssign) loadUsersForScope(token, { companyId: scopeCompany, teamId: defaults.team_id, pageSize: 100 }).then(setUsers).catch(() => setUsers([]));
  }, [open, token, scopeCompany, defaults.team_id, canAssign]);

  const setTableFrom = (parsed, name) => {
    setTable(parsed);
    setFileName(name);
    setMap(autoMatchColumns(parsed.headers));
    setError("");
    setStep(1);
  };

  async function readFile(file) {
    if (!file) return;
    setBusy("Reading the file…");
    setError("");
    try {
      const parsed = await apiRequest("/leads/import/parse", {
        method: "POST", token, rawBody: file, headers: { "Content-Type": "application/octet-stream", "x-file-name": encodeURIComponent(file.name) },
      });
      setTableFrom(parsed, file.name);
    } catch (err) {
      setError(err.message || "The file could not be read.");
    } finally {
      setBusy("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function usePaste() {
    const lines = paste.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) { setError("Paste a heading row and at least one lead, copied from Excel."); return; }
    const split = (line) => line.split("\t").map((cell) => cell.trim());
    const headers = split(lines[0]).map((header, i) => header || `Column ${i + 1}`);
    setTableFrom({ headers, rows: lines.slice(1).map(split) }, "Pasted rows");
  }

  async function downloadTemplate() {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/leads/import/template`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("The template could not be downloaded.");
      saveBlob(await response.blob(), "GreenCRM-lead-upload-template.xlsx");
    } catch (err) {
      setError(err.message);
    }
  }

  const built = useMemo(() => {
    if (!table || step < 1) return [];
    return table.rows.map((cells, index) => ({ cells, ...buildImportRow(cells, index, map, { products, users, defaults }) }));
  }, [table, map, products, users, defaults, step]);
  const nameMapped = map.company_name !== undefined || map.contact_person !== undefined;
  const contactMapped = map.phone !== undefined || map.email !== undefined;
  const productReady = Boolean(defaults.product_id) || map.product !== undefined;
  const teamNeeded = teams.length > 1 && !defaults.team_id;
  const companyNeeded = isPlatformConsole && !companyId;
  const missing = [
    !nameMapped ? "Match a column to Company or Contact person" : "",
    !contactMapped ? "Match a column to Phone or Email" : "",
    !productReady ? "Choose a product, or match a Product column" : "",
    teamNeeded ? "Choose a team" : "",
    companyNeeded ? "Choose a company" : "",
  ].filter(Boolean);

  async function runCheck() {
    setBusy("Checking your leads…");
    setProgress(0);
    setError("");
    try {
      const seen = new Map();
      const out = built.map(({ row, errors, cells }) => {
        if (errors.length) return { row, cells, status: "error", message: errors.join(". ") };
        if (row.phone && seen.has(row.phone)) return { row, cells, status: "duplicate", message: `Same phone as row ${seen.get(row.phone)} in this file.` };
        if (row.phone) seen.set(row.phone, row.__row_number);
        return { row, cells, status: "ok" };
      });
      const pending = out.filter((item) => item.status === "ok");
      for (let i = 0; i < pending.length; i += CHECK_BATCH) {
        const batch = pending.slice(i, i + CHECK_BATCH);
        const response = await apiRequest("/leads/import/check", { method: "POST", token, body: { rows: batch.map((item) => item.row), company_id: scopeCompany } });
        (response.results || []).forEach((res) => {
          const item = batch.find((b) => b.row.__row_number === res.row);
          if (item) { item.status = res.status; item.message = res.message || ""; }
        });
        setProgress(Math.round(((i + batch.length) / pending.length) * 100));
      }
      setReview(out);
      setFilter("all");
      setStep(2);
    } catch (err) {
      setError(err.message || "The leads could not be checked.");
    } finally {
      setBusy("");
    }
  }

  const counts = useMemo(() => review.reduce((acc, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), { ok: 0, duplicate: 0, error: 0 }), [review]);

  async function runImport() {
    const ready = review.filter((item) => item.status === "ok");
    setBusy("Importing leads…");
    setProgress(0);
    setError("");
    let imported = 0;
    const failures = [];
    try {
      for (let i = 0; i < ready.length; i += SAVE_BATCH) {
        const batch = ready.slice(i, i + SAVE_BATCH);
        const response = await apiRequest("/leads/bulk-upload", { method: "POST", token, body: { partial: true, company_id: scopeCompany, rows: batch.map((item) => item.row) } });
        imported += response.imported || 0;
        (response.errors || []).forEach((row) => failures.push(row));
        setProgress(Math.round(((i + batch.length) / ready.length) * 100));
      }
    } catch (err) {
      setError(`Stopped after ${imported} leads: ${err.message || "the server did not respond."} The rest were not saved.`);
    }
    const failedRows = new Map(failures.map((row) => [row.row, row.message]));
    const notSaved = review.filter((item) => item.status !== "ok" || failedRows.has(item.row.__row_number))
      .map((item) => ({ ...item, message: failedRows.get(item.row.__row_number) || item.message }));
    setResult({ imported, notSaved });
    setBusy("");
    setStep(3);
    if (imported) onImported?.();
  }

  function downloadProblems() {
    const rows = result ? result.notSaved : review.filter((item) => item.status !== "ok");
    const csv = toCsv(["Row", "Reason", ...table.headers], rows.map((item) => [item.row.__row_number, item.message, ...item.cells]));
    saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "GreenCRM-leads-to-fix.csv");
  }

  if (!open) return null;
  const preview = review.filter((item) => filter === "all" || item.status === filter).slice(0, 200);
  const setDefault = (key, value) => setDefaults((current) => ({ ...current, [key]: value, ...(key === "team_id" ? { product_id: "", assigned_to: "" } : {}) }));
  const groups = [...new Set(IMPORT_FIELDS.map((field) => field.group))];

  return (
    <div className="tw-buttons fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-[2px] sm:p-5" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div role="dialog" aria-modal="true" aria-label="Bulk upload leads" className="flex max-h-full w-full max-w-[980px] flex-col overflow-hidden rounded-[16px] bg-[#f7f8f6] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.5)]">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-white px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-bold text-slate-900">Bulk upload leads</h2>
            {fileName ? <p className="truncate text-[12.5px] text-slate-500">{fileName} · {table?.rows.length.toLocaleString("en-IN")} rows</p> : <p className="text-[12.5px] text-slate-500">Add many leads from an Excel or CSV file</p>}
          </div>
          <Stepper step={step} />
          <button type="button" onClick={close} disabled={Boolean(busy)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-40">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>Close
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
          {error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">{error}</p> : null}
          {busy ? (
            <div className="rounded-[12px] bg-white p-4 ring-1 ring-slate-200" role="status">
              <p className="text-[13.5px] font-semibold text-slate-800">{busy}{progress ? ` ${progress}%` : ""}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress || 8}%` }} /></div>
            </div>
          ) : null}

          {step === 0 ? (
            <>
              {isPlatformConsole ? (
                <label className="block max-w-sm text-[12.5px] font-semibold text-slate-600">Company
                  <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={`${SELECT} mt-1`}>
                    <option value="">Choose a company</option>
                    {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.name}</option>)}
                  </select>
                </label>
              ) : null}
              <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
                className={`rounded-[14px] border-2 border-dashed bg-white px-6 py-10 text-center transition ${dragging ? "border-brand-500 bg-brand-50" : "border-slate-300"}`}>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-[12px] bg-brand-50 text-brand-700">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16" /></svg>
                </span>
                <p className="mt-3 text-[15px] font-semibold text-slate-900">Drop your Excel or CSV file here</p>
                <p className="mt-0.5 text-[13px] text-slate-500">Any column names and order work. Up to 5,000 leads, 10 MB.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" className={PRIMARY} disabled={Boolean(busy)} onClick={() => inputRef.current?.click()}>Choose file</button>
                  <button type="button" className={GHOST} onClick={downloadTemplate}>Download template</button>
                </div>
                <input ref={inputRef} type="file" accept=".xlsx,.csv" hidden onChange={(e) => readFile(e.target.files?.[0])} aria-label="Choose a file" />
              </div>
              <details className="rounded-[12px] bg-white px-4 py-3 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-slate-700">Or paste rows copied from Excel</summary>
                <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} aria-label="Pasted rows" placeholder={"Company\tContact\tPhone\nKapoor Steels\tRajesh\t9810012345"}
                  className="mt-2 w-full resize-y rounded-[10px] border border-slate-200 p-2.5 font-mono text-[12.5px] outline-none focus:border-brand-400" />
                <button type="button" className={`${GHOST} mt-2`} disabled={!paste.trim()} onClick={usePaste}>Use these rows</button>
              </details>
            </>
          ) : null}

          {step === 1 && table ? (
            <>
              <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
                <h3 className="text-[14px] font-bold text-slate-900">For the whole file</h3>
                <p className="mb-3 text-[12.5px] text-slate-500">Used when a row has no value of its own.</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {teams.length > 1 ? (
                    <label className="block text-[12.5px] font-semibold text-slate-600">Team {teamNeeded ? <span className="text-rose-500">*</span> : null}
                      <select value={defaults.team_id} onChange={(e) => setDefault("team_id", e.target.value)} className={`${SELECT} mt-1`}>
                        <option value="">Choose team</option>
                        {teams.map((t) => <option key={t.team_id} value={t.team_id}>{teamSelectLabel(t)}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="block text-[12.5px] font-semibold text-slate-600">Product {!productReady ? <span className="text-rose-500">*</span> : null}
                    <select value={defaults.product_id} onChange={(e) => setDefault("product_id", e.target.value)} className={`${SELECT} mt-1`}>
                      <option value="">Choose product</option>
                      {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                    </select>
                  </label>
                  {canAssign ? (
                    <label className="block text-[12.5px] font-semibold text-slate-600">Owner
                      <select value={defaults.assigned_to} onChange={(e) => setDefault("assigned_to", e.target.value)} className={`${SELECT} mt-1`}>
                        <option value="">Keep with me</option>
                        {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="block text-[12.5px] font-semibold text-slate-600">Source
                    <input value={defaults.lead_source} onChange={(e) => setDefault("lead_source", e.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="other" className={`${SELECT} mt-1`} />
                  </label>
                </div>
              </section>
              <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
                <h3 className="text-[14px] font-bold text-slate-900">Match your columns</h3>
                <p className="mb-2 text-[12.5px] text-slate-500">We matched what we could. Check them, and change any that are wrong.</p>
                {groups.map((group) => (
                  <div key={group} className="mt-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group}</p>
                    <div className="divide-y divide-slate-100 rounded-[10px] ring-1 ring-slate-200">
                      {IMPORT_FIELDS.filter((field) => field.group === group).map((field) => {
                        const index = map[field.key];
                        const samples = index === undefined ? [] : table.rows.map((row) => row[index]).filter(Boolean).slice(0, 2);
                        return (
                          <div key={field.key} className="grid items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:grid-cols-[150px_210px_minmax(0,1fr)]">
                            <label htmlFor={`map-${field.key}`} className="text-[13px] font-semibold text-slate-800">{field.label}{field.required ? <span className="text-rose-500"> *</span> : null}</label>
                            <select id={`map-${field.key}`} value={index ?? ""} onChange={(e) => setMap((current) => { const next = { ...current }; if (e.target.value === "") delete next[field.key]; else next[field.key] = Number(e.target.value); return next; })} className={`${SELECT} h-8`}>
                              <option value="">Not in my file</option>
                              {table.headers.map((header, i) => <option key={i} value={i}>{header}</option>)}
                            </select>
                            <span className="truncate text-[12px] text-slate-400">{samples.join(" · ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[["ok", "Ready to import", "text-emerald-700"], ["duplicate", "Already exist, skipped", "text-amber-700"], ["error", "Need fixing, skipped", "text-rose-700"]].map(([key, name, tone]) => (
                  <button key={key} type="button" onClick={() => setFilter(filter === key ? "all" : key)} aria-pressed={filter === key}
                    className={`rounded-[12px] bg-white p-3 text-left ring-1 ${filter === key ? "ring-2 ring-brand-500" : "ring-slate-200"}`}>
                    <span className={`block text-[22px] font-bold leading-none tabular-nums ${tone}`}>{(counts[key] || 0).toLocaleString("en-IN")}</span>
                    <span className="mt-1 block text-[12px] text-slate-500">{name}</span>
                  </button>
                ))}
              </div>
              <section className="overflow-hidden rounded-[14px] bg-white ring-1 ring-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-[13px]">
                    <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2">Row</th><th className="px-2 py-2">Result</th><th className="px-2 py-2">Company</th><th className="px-2 py-2">Contact</th><th className="px-2 py-2">Phone</th><th className="px-3 py-2">Problem</th>
                    </tr></thead>
                    <tbody>
                      {preview.map((item) => (
                        <tr key={item.row.__row_number} className="border-b border-slate-100 align-top last:border-0">
                          <td className="px-3 py-1.5 tabular-nums text-slate-400">{item.row.__row_number}</td>
                          <td className="whitespace-nowrap px-2 py-1.5"><span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${STATUS[item.status][1]}`}>{STATUS[item.status][0]}</span></td>
                          <td className="px-2 py-1.5 font-medium text-slate-800">{item.row.company_name || "–"}</td>
                          <td className="px-2 py-1.5 text-slate-600">{item.row.contact_person || "–"}</td>
                          <td className="px-2 py-1.5 tabular-nums text-slate-600">{item.row.phone || item.row.email || "–"}</td>
                          <td className="px-3 py-1.5 text-[12.5px] text-slate-500">{item.message || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {review.filter((item) => filter === "all" || item.status === filter).length > 200 ? <p className="border-t border-slate-100 px-3 py-2 text-[12px] text-slate-500">Showing the first 200 rows.</p> : null}
              </section>
            </>
          ) : null}

          {step === 3 && result ? (
            <section className="rounded-[14px] bg-white p-6 text-center ring-1 ring-slate-200">
              <p className="text-[34px] font-bold leading-none text-emerald-700">{result.imported.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-[15px] font-semibold text-slate-900">{result.imported === 1 ? "lead" : "leads"} imported</p>
              {result.notSaved.length ? <p className="mt-1 text-[13px] text-slate-500">{result.notSaved.length.toLocaleString("en-IN")} rows were not imported. Download them with the reason, fix them and upload again.</p> : <p className="mt-1 text-[13px] text-slate-500">Every row went in.</p>}
              {result.notSaved.length ? (
                <div className="mx-auto mt-4 max-w-xl overflow-hidden rounded-[10px] text-left ring-1 ring-slate-200">
                  {result.notSaved.slice(0, 5).map((item) => (
                    <p key={item.row.__row_number} className="border-b border-slate-100 px-3 py-1.5 text-[12.5px] text-slate-600 last:border-0"><b className="font-semibold text-slate-800">Row {item.row.__row_number}:</b> {item.message}</p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-5 py-3">
          {step === 1 ? <p className="min-w-0 flex-1 text-[12.5px] font-medium text-rose-600">{missing[0] || ""}</p> : <span className="flex-1" />}
          {step === 0 ? <button type="button" className={GHOST} onClick={close}>Cancel</button> : null}
          {step === 1 ? <button type="button" className={GHOST} disabled={Boolean(busy)} onClick={() => { setTable(null); setFileName(""); setStep(0); }}>Back</button> : null}
          {step === 1 ? <button type="button" className={PRIMARY} disabled={Boolean(busy) || missing.length > 0} onClick={runCheck}>Check {table?.rows.length.toLocaleString("en-IN")} rows</button> : null}
          {step === 2 ? <button type="button" className={GHOST} disabled={Boolean(busy)} onClick={() => setStep(1)}>Back</button> : null}
          {step === 2 && (counts.duplicate || counts.error) ? <button type="button" className={GHOST} onClick={downloadProblems}>Download rows to fix</button> : null}
          {step === 2 ? <button type="button" className={PRIMARY} disabled={Boolean(busy) || !counts.ok} onClick={runImport}>Import {(counts.ok || 0).toLocaleString("en-IN")} {counts.ok === 1 ? "lead" : "leads"}</button> : null}
          {step === 3 && result?.notSaved.length ? <button type="button" className={GHOST} onClick={downloadProblems}>Download rows to fix</button> : null}
          {step === 3 ? <button type="button" className={GHOST} onClick={() => { if (result?.imported) onImported?.(); reset(); }}>Upload another file</button> : null}
          {step === 3 ? <button type="button" className={PRIMARY} onClick={close}>View leads</button> : null}
        </footer>
      </div>
    </div>
  );
}
