"use client";

import DashboardShell from "../../components/dashboard/DashboardShell";
import ChannelActionsPanel from "../../components/communications/ChannelActionsPanel";
import CommunicationHero from "../../components/communications/CommunicationHero";
import EmailComposerPanel from "../../components/communications/EmailComposerPanel";
import EmailTemplatePanel from "../../components/communications/EmailTemplatePanel";
import RecordDirectoryPanel from "../../components/communications/RecordDirectoryPanel";
import SelectedEntityCard from "../../components/communications/SelectedEntityCard";
import { useCommunicationWorkspace } from "../../components/communications/useCommunicationWorkspace";

export default function CommunicationsPage() {
  const workspace = useCommunicationWorkspace();

  return (
    <DashboardShell session={workspace.session} title="Communications" hideTitle heroStats={[]}>
      {workspace.error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{workspace.error}</div> : null}
      {workspace.message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{workspace.message}</div> : null}
      {workspace.loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading communication workspace...</div> : null}

      {!workspace.loading ? (
        <section className="space-y-5">
          <CommunicationHero leads={workspace.leads} customers={workspace.customers} records={workspace.records} selectedRecord={workspace.selectedRecord} capabilities={workspace.capabilities} />
          <div className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr] xl:items-start">
            <RecordDirectoryPanel currentPage={workspace.currentPage} totalPages={workspace.totalPages} search={workspace.search} setSearch={workspace.setSearch} entityFilter={workspace.entityFilter} setEntityFilter={workspace.setEntityFilter} paginatedRecords={workspace.paginatedRecords} filteredRecords={workspace.filteredRecords} selectedKey={workspace.selectedKey} setSelectedKey={workspace.setSelectedKey} setCurrentPage={workspace.setCurrentPage} />
            <div className="space-y-5">
              <SelectedEntityCard record={workspace.selectedRecord} />
              {workspace.selectedRecord ? (
                <>
                  <EmailTemplatePanel templates={workspace.templates} selectedTemplateId={workspace.selectedTemplateId} chooseTemplate={workspace.chooseTemplate} />
                  <EmailComposerPanel recipient={workspace.recipient} cc={workspace.cc} subject={workspace.subject} body={workspace.body} setRecipient={workspace.setRecipient} setCc={workspace.setCc} setSubject={workspace.setSubject} setBody={workspace.setBody} copyDraft={workspace.copyDraft} copyState={workspace.copyState} sendEmail={workspace.sendEmail} sending={workspace.sending} record={workspace.selectedRecord} capability={workspace.capabilities.email} />
                  <ChannelActionsPanel record={workspace.selectedRecord} capabilities={workspace.capabilities} phoneDrafts={workspace.phoneDrafts} setPhoneDraft={workspace.setPhoneDraft} sendChannel={workspace.sendChannel} sending={workspace.sending} />
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
