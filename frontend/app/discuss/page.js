"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "../../components/dashboard/DashboardShell";
import ChatList from "../../components/discuss/ChatList";
import ChatThread from "../../components/discuss/ChatThread";
import GroupDialog from "../../components/discuss/GroupDialog";
import { useDiscuss } from "../../components/discuss/useDiscuss";
import { loadSession } from "../../lib/session";

/** Discuss: team groups and direct messages, live. */
export default function DiscussPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [pending, setPending] = useState("");
  const d = useDiscuss(session);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/discuss"); return; }
    setSession(s);
    setPending(new URLSearchParams(window.location.search).get("chat") || "");
  }, [router]);
  // A link like /discuss?chat=d:12 opens that chat once the list has loaded.
  useEffect(() => {
    if (pending && d.list) { d.openChat(pending); setPending(""); }
  }, [pending, d.list, d]);

  const myId = Number(session?.user?.id || d.list?.me || 0);
  const people = d.list?.people || [];
  const openGroup = d.thread?.chat?.type === "group" ? d.thread.chat : null;

  return (
    <DashboardShell session={session} title="Discuss" hideTitle heroStats={[]}>
      <div className="tw-buttons -mb-2">
        <div className="grid h-[calc(100dvh-60px-48px)] min-h-[460px] grid-cols-1 overflow-hidden rounded-[16px] bg-white ring-1 ring-slate-200 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className={`min-h-0 border-r border-slate-200 ${d.activeKey ? "hidden lg:block" : ""}`}>
            {d.error ? <p role="alert" className="m-3 rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{d.error}</p> : null}
            <ChatList list={d.list} activeKey={d.activeKey} onOpen={d.openChat} onNewGroup={() => setDialog("new")} typing={d.typing} />
          </aside>
          <section className={`min-h-0 ${d.activeKey ? "" : "hidden lg:block"}`}>
            <ChatThread d={d} token={session?.token} isAdmin={session?.user?.role === "admin"} onBack={() => d.openChat("")} onInfo={() => setDialog("info")} />
          </section>
        </div>
      </div>
      <GroupDialog open={dialog === "new"} onClose={() => setDialog(null)} people={people} canCompanyWide={d.list?.can_create_company_wide} myId={myId} onCreate={d.createGroup} />
      <GroupDialog open={dialog === "info" && Boolean(openGroup)} onClose={() => setDialog(null)} people={people} myId={myId} group={openGroup}
        onUpdate={d.updateGroup} onLeave={d.leaveGroup} />
    </DashboardShell>
  );
}
