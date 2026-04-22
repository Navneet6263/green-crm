"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";
import { ALLOWED_ROLES, PAGE_SIZE } from "./constants";
import {
  buildEntityRecords,
  buildPhoneDraft,
  buildTemplates,
  loadRequestedEntity,
  mergeUpdatedEntity,
} from "./utils";

export function useCommunicationWorkspace() {
  const router = useRouter();
  const [state, setState] = useState({ session: null, leads: [], customers: [], capabilities: {}, loading: true, error: "", message: "", search: "", entityFilter: "all", currentPage: 1, selectedKey: "", requestedType: "", requestedId: "", selectedTemplateId: "", recipient: "", cc: "", subject: "", body: "", phoneDrafts: { sms: "", whatsapp: "" }, sending: "", copyState: "idle" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("entity") || (params.get("customer") ? "customer" : params.get("lead") ? "lead" : "");
    const requestedId = params.get("id") || params.get("customer") || params.get("lead") || "";
    setState((current) => ({ ...current, requestedType, requestedId, entityFilter: requestedType || "all", selectedKey: requestedType && requestedId ? `${requestedType}:${requestedId}` : "" }));
  }, []);

  const records = useMemo(() => buildEntityRecords(state.leads, state.customers), [state.customers, state.leads]);
  const selectedRecord = useMemo(() => records.find((item) => item.key === state.selectedKey) || null, [records, state.selectedKey]);
  const templates = useMemo(() => buildTemplates(selectedRecord), [selectedRecord]);
  const filteredRecords = useMemo(() => {
    const query = state.search.trim().toLowerCase();
    return [...records]
      .sort((left, right) => (left.entity_type === right.entity_type ? String(left.title || "").localeCompare(String(right.title || "")) : left.entity_type === "lead" ? -1 : 1))
      .filter((record) => (state.entityFilter === "all" || record.entity_type === state.entityFilter) && (!query || [record.title, record.subtitle, record.email, record.phone, record.owner, record.status].filter(Boolean).join(" ").toLowerCase().includes(query)));
  }, [records, state.entityFilter, state.search]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const paginatedRecords = useMemo(() => filteredRecords.slice((state.currentPage - 1) * PAGE_SIZE, state.currentPage * PAGE_SIZE), [filteredRecords, state.currentPage]);

  useEffect(() => setState((current) => ({ ...current, currentPage: 1 })), [state.entityFilter, state.search]);
  useEffect(() => {
    if (state.currentPage > totalPages) {
      setState((current) => ({ ...current, currentPage: totalPages }));
    }
  }, [state.currentPage, totalPages]);

  useEffect(() => {
    if (!selectedRecord) return;
    const nextTemplate = buildTemplates(selectedRecord)[0];
    setState((current) => ({ ...current, recipient: selectedRecord.email || "", cc: "", selectedTemplateId: nextTemplate?.id || "", subject: nextTemplate?.subject || "", body: nextTemplate?.body || "", phoneDrafts: { sms: buildPhoneDraft(selectedRecord), whatsapp: buildPhoneDraft(selectedRecord) } }));
  }, [selectedRecord?.key]);

  useEffect(() => {
    const session = loadSession();
    if (!session) return void router.replace("/login");
    if (!ALLOWED_ROLES.includes(session.user?.role)) return void router.replace("/dashboard");

    async function loadWorkspace() {
      setState((current) => ({ ...current, session, loading: true, error: "", message: "" }));
      try {
        const [capabilities, leadResponse, customerResponse] = await Promise.all([
          apiRequest("/capabilities", { token: session.token }),
          apiRequest("/leads?page_size=80", { token: session.token }),
          apiRequest("/customers?page_size=80", { token: session.token }),
        ]);

        let leads = leadResponse.items || [];
        let customers = customerResponse.items || [];
        if (state.requestedType && state.requestedId) {
          try {
            const focused = await loadRequestedEntity(state.requestedType, state.requestedId, session.token, apiRequest);
            if (state.requestedType === "lead" && focused && !leads.some((item) => item.lead_id === state.requestedId)) leads = [focused, ...leads];
            if (state.requestedType === "customer" && focused && !customers.some((item) => item.customer_id === state.requestedId)) customers = [focused, ...customers];
          } catch (_error) {}
        }

        const nextRecords = buildEntityRecords(leads, customers);
        setState((current) => ({ ...current, session, leads, customers, capabilities, loading: false, selectedKey: current.selectedKey && nextRecords.some((item) => item.key === current.selectedKey) ? current.selectedKey : state.requestedType && state.requestedId ? `${state.requestedType}:${state.requestedId}` : nextRecords[0]?.key || "" }));
      } catch (error) {
        setState((current) => ({ ...current, loading: false, error: error.message, leads: [], customers: [] }));
      }
    }

    loadWorkspace();
  }, [router, state.requestedId, state.requestedType]);

  async function runAction(path, body, successMessage, entityType) {
    setState((current) => ({ ...current, sending: path, error: "", message: "" }));
    try {
      const response = await apiRequest(path, { method: "POST", token: state.session.token, body });
      setState((current) => ({ ...current, leads: entityType === "lead" && response.entity ? mergeUpdatedEntity(current.leads, entityType, response.entity) : current.leads, customers: entityType === "customer" && response.entity ? mergeUpdatedEntity(current.customers, entityType, response.entity) : current.customers, sending: "", message: successMessage(response) }));
    } catch (error) {
      setState((current) => ({ ...current, sending: "", error: error.message }));
    }
  }

  return {
    ...state,
    records,
    selectedRecord,
    templates,
    filteredRecords,
    totalPages,
    paginatedRecords,
    setSearch: (search) => setState((current) => ({ ...current, search })),
    setEntityFilter: (entityFilter) => setState((current) => ({ ...current, entityFilter })),
    setCurrentPage: (currentPage) => setState((current) => ({ ...current, currentPage })),
    setSelectedKey: (selectedKey) => setState((current) => ({ ...current, selectedKey })),
    setRecipient: (recipient) => setState((current) => ({ ...current, recipient })),
    setCc: (cc) => setState((current) => ({ ...current, cc })),
    setSubject: (subject) => setState((current) => ({ ...current, subject })),
    setBody: (body) => setState((current) => ({ ...current, body })),
    setPhoneDraft: (channel, value) => setState((current) => ({ ...current, phoneDrafts: { ...current.phoneDrafts, [channel]: value } })),
    chooseTemplate: (template) => setState((current) => ({ ...current, selectedTemplateId: template.id, subject: template.subject, body: template.body })),
    copyDraft: async () => {
      try {
        await navigator.clipboard.writeText(`To: ${state.recipient}\nCC: ${state.cc}\nSubject: ${state.subject}\n\n${state.body}`);
        setState((current) => ({ ...current, copyState: "copied" }));
        window.setTimeout(() => setState((current) => ({ ...current, copyState: "idle" })), 1800);
      } catch (_error) {
        setState((current) => ({ ...current, error: "Clipboard access is unavailable in this browser." }));
      }
    },
    sendEmail: () => runAction("/communications/email", { entity_type: selectedRecord?.entity_type, entity_id: selectedRecord?.entity_id, to: state.recipient.trim(), cc: state.cc.trim(), subject: state.subject.trim(), body: state.body.trim() }, (response) => response.delivery?.delivery === "email" ? "Email sent successfully." : "Email logged in CRM, but delivery fell back to preview mode.", selectedRecord?.entity_type),
    sendChannel: (channel) => runAction(`/communications/${channel}`, { entity_type: selectedRecord?.entity_type, entity_id: selectedRecord?.entity_id, to: selectedRecord?.phone || "", body: state.phoneDrafts[channel] || "" }, () => `${channel === "sms" ? "SMS" : channel === "whatsapp" ? "WhatsApp" : "Call"} action completed.`, selectedRecord?.entity_type),
  };
}
