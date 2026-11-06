"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AdminPage from "../../components/layout/AdminPage";
import { loadSession } from "../../lib/session";
import ActivityTab from "./ActivityTab";
import ApiGuide from "./ApiGuide";
import KeysTab from "./KeysTab";
import LinksTab from "./LinksTab";
import OverviewTab from "./OverviewTab";
import WebhooksTab from "./WebhooksTab";
import { D, Tabs } from "./dev-ui";
import { useDeveloper } from "./useDeveloper";

const TABS = [["overview", "Overview"], ["links", "Lead capture"], ["keys", "API keys"], ["webhooks", "Webhooks"], ["activity", "Activity"], ["guide", "API guide"]];

function Locked() {
  return (
    <div className={`${D.panel} mx-auto max-w-xl p-8 text-center`}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-gold-50 text-gold-700 ring-1 ring-gold-100">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      </div>
      <p className="mt-4 text-[17px] font-bold text-slate-900">Developer API is not on for your company</p>
      <p className="mt-1.5 text-[13px] text-slate-500">It lets you bring leads in from your website, Facebook and Google ads, IndiaMART and other apps, and gives your developer an API. Ask GreenCRM to switch it on for you.</p>
    </div>
  );
}

function DeveloperPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [session, setSession] = useState(null);
  const [linkEditor, setLinkEditor] = useState(false);
  const [keyDrawer, setKeyDrawer] = useState(false);
  const [hookEditor, setHookEditor] = useState(false);

  useEffect(() => {
    const active = loadSession();
    if (!active) return router.replace("/login");
    if (active.user?.role !== "admin") return router.replace("/dashboard");
    setSession(active);
  }, [router]);

  const dev = useDeveloper(session);
  const tab = TABS.some(([key]) => key === params.get("tab")) ? params.get("tab") : "overview";
  const go = (key) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const newLink = () => { go("links"); setLinkEditor(true); };
  const newKey = () => { go("keys"); setKeyDrawer(true); };

  if (!session) return null;

  const actions = dev.locked || dev.loading ? null : (
    <>
      {tab === "webhooks" ? <button type="button" className={D.ghost} onClick={() => setHookEditor(true)}>New webhook</button> : null}
      <button type="button" className={D.ghost} onClick={newKey}>New API key</button>
      <button type="button" className={D.primary} onClick={newLink}>New lead link</button>
    </>
  );

  return (
    <AdminPage session={session} title="Developer" description="Bring leads in from your website, ads and other apps, and connect your own software. Only admins see this page." actions={actions}>
      {dev.loading ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className={`${D.panel} h-[104px] animate-pulse`} />)}</div>
      ) : dev.locked ? (
        <Locked />
      ) : (
        <div className="space-y-4">
          {dev.error ? <p className="rounded-[12px] bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 ring-1 ring-rose-100">{dev.error}</p> : null}
          <Tabs items={TABS.map(([key, label]) => [key, key === "links" && dev.links.length ? `${label} · ${dev.links.length}` : key === "keys" && dev.keys.length ? `${label} · ${dev.keys.filter((k) => k.state === "active").length}` : key === "webhooks" && dev.hooks.length ? `${label} · ${dev.hooks.length}` : label])} value={tab} onChange={go} />
          {tab === "overview" ? <OverviewTab overview={dev.overview} links={dev.links} keys={dev.keys} onGo={go} onNewLink={newLink} /> : null}
          {tab === "links" ? <LinksTab dev={dev} editorOpen={linkEditor} setEditorOpen={setLinkEditor} /> : null}
          {tab === "keys" ? <KeysTab dev={dev} drawerOpen={keyDrawer} setDrawerOpen={setKeyDrawer} /> : null}
          {tab === "webhooks" ? <WebhooksTab dev={dev} editorOpen={hookEditor} setEditorOpen={setHookEditor} /> : null}
          {tab === "activity" ? <ActivityTab dev={dev} /> : null}
          {tab === "guide" ? <ApiGuide onNewKey={newKey} /> : null}
        </div>
      )}
    </AdminPage>
  );
}

export default function Page() {
  return <Suspense fallback={null}><DeveloperPage /></Suspense>;
}
