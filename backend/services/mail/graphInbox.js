// Reads replies to admin emails from a Microsoft 365 mailbox (Microsoft Graph, app-only access).
// Off until these are set in .env: MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET, MS_GRAPH_MAILBOX.
// The Azure app needs the "Mail.Read" application permission with admin consent.

const env = (name) => String(process.env[name] || "").trim();
const mailbox = () => env("MS_GRAPH_MAILBOX").toLowerCase();
const configured = () => Boolean(env("MS_GRAPH_TENANT_ID") && env("MS_GRAPH_CLIENT_ID") && env("MS_GRAPH_CLIENT_SECRET") && mailbox());

let lastRun = { at: null, found: 0, error: null };
const status = () => ({ connected: configured(), mailbox: configured() ? mailbox() : null, last_sync: lastRun.at, last_error: lastRun.error });

let cachedToken = null;
async function getToken(fetchImpl) {
  if (cachedToken && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  const response = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(env("MS_GRAPH_TENANT_ID"))}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("MS_GRAPH_CLIENT_ID"), client_secret: env("MS_GRAPH_CLIENT_SECRET"), scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error(`Microsoft sign-in failed: ${data.error_description || data.error || response.status}`);
  cachedToken = { value: data.access_token, expires: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

/** Inbox messages received after `since`, oldest first, with the headers that link a reply to the original. */
async function fetchMessagesSince(since, fetchImpl) {
  const token = await getToken(fetchImpl);
  const select = "id,internetMessageId,subject,from,receivedDateTime,body,internetMessageHeaders";
  let url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox())}/mailFolders/inbox/messages?$filter=${encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`)}&$orderby=receivedDateTime asc&$top=50&$select=${select}`;
  const messages = [];
  for (let page = 0; url && page < 10; page++) {
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Reading the inbox failed: ${data.error?.message || response.status}`);
    messages.push(...(data.value || []));
    url = data["@odata.nextLink"] || null;
  }
  return messages;
}

// Plain-language hints for the usual setup mistakes.
function explain(message) {
  const m = String(message || "");
  if (/AADSTS7000215|invalid_client/i.test(m)) return "The client secret is wrong. Use the secret's Value (not its Secret ID), and check it has not expired.";
  if (/AADSTS700016|unauthorized_client/i.test(m)) return "Microsoft does not know this app in this tenant. Copy the Application (client) ID (not the Object ID) and the Directory (tenant) ID from the same app's Overview page.";
  if (/AADSTS90002|tenant/i.test(m) && /not found/i.test(m)) return "The tenant ID is wrong. Copy the Directory (tenant) ID from the app's Overview page.";
  if (/ErrorAccessDenied|Access is denied|Authorization_RequestDenied|403/i.test(m)) return "Signed in, but the app cannot read this mailbox. Grant admin consent for Mail.Read (Application), and make sure the Exchange access policy includes this mailbox. Policy changes can take up to an hour.";
  if (/MailboxNotEnabledForRESTAPI|ResourceNotFound|ErrorInvalidUser|404/i.test(m)) return "The mailbox was not found. Check MS_GRAPH_MAILBOX is the full address of a licensed mailbox.";
  return m;
}

/** One quick read of the inbox, to confirm the setup. Never returns the secret. */
async function testConnection(fetchImpl = fetch) {
  if (!configured()) return { ok: false, error: "Not set up: fill MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_ID, MS_GRAPH_CLIENT_SECRET and MS_GRAPH_MAILBOX in .env, then restart." };
  // A secret shaped like a GUID is almost always the Secret ID, which Microsoft does not accept.
  const secretWarning = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env("MS_GRAPH_CLIENT_SECRET"))
    ? " Also: MS_GRAPH_CLIENT_SECRET looks like the Secret ID. Use the secret's Value (shown only once, when it is created; make a new one if you did not copy it)." : "";
  try {
    cachedToken = null;
    const token = await getToken(fetchImpl);
    const response = await fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox())}/mailFolders/inbox/messages?$top=1&$select=receivedDateTime,subject`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, mailbox: mailbox(), error: explain(`${data.error?.code || response.status} ${data.error?.message || ""}`) + secretWarning };
    return { ok: true, mailbox: mailbox(), latest: data.value?.[0]?.receivedDateTime || null };
  } catch (error) {
    return { ok: false, mailbox: mailbox(), error: explain(error.message) + secretWarning };
  }
}

const header = (message, name) => (message.internetMessageHeaders || []).find((h) => h.name.toLowerCase() === name)?.value || "";

/** Which sent email a message answers: by the In-Reply-To / References headers, else by the "Ref N-XXXXXX" in the subject. */
function matchNudge(message, nudges) {
  const linked = `${header(message, "in-reply-to")} ${header(message, "references")}`;
  const byHeader = nudges.find((n) => n.message_id && linked.includes(n.message_id.replace(/[<>]/g, "")));
  if (byHeader) return byHeader;
  const ref = /Ref\s+(N-[0-9A-F]{6})/i.exec(message.subject || "")?.[1]?.toUpperCase();
  return ref ? nudges.find((n) => n.ref_code === ref) || null : null;
}

/**
 * For a "could not be delivered" notice (Microsoft 365, Gmail, most servers), the address that does not exist; else "".
 * The CRM then stops emailing that address.
 */
function bouncedAddress(message) {
  const from = String(message.from?.emailAddress?.address || "").toLowerCase();
  const subject = String(message.subject || "");
  const isNotice = /^(postmaster|mailer-daemon|microsoftexchange)/.test(from) || /^(undeliverable|delivery status notification \(failure\)|mail delivery (failed|subsystem)|returned mail|delivery has failed)/i.test(subject);
  if (!isNotice) return "";
  const body = String(message.body?.content || "").replace(/\s+/g, " ");
  const hit = /(?:message to|wasn't delivered to|was not delivered to|couldn't be delivered to|could not be delivered to|delivery to the following recipients? failed[^:]*:|address not found[^@]*?)\s*<?([a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/i.exec(body);
  return hit ? hit[1].toLowerCase() : "";
}

/** Keeps only the new part of a reply, dropping the quoted original. */
function replyText(body) {
  const lines = String(body || "").replace(/\r/g, "").split("\n");
  const cut = lines.findIndex((line) => /^(From:|-----\s*Original Message|_{8,}|On .+wrote:$|Sent from my )/i.test(line.trim()));
  return (cut >= 0 ? lines.slice(0, cut) : lines).join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 8000);
}

/**
 * One pass: reads new inbox mail, saves replies to admin emails, and notes them on the lead.
 * `deps` lets tests pass fakes for fetch and the database.
 */
async function syncInbox(deps = {}) {
  if (!configured()) return { skipped: true, reason: "Microsoft 365 inbox is not connected." };
  const fetchImpl = deps.fetch || fetch;
  const repo = deps.repo || require("../../repositories/nudgeRepository");
  const onReply = deps.onReply || defaultOnReply;
  const box = mailbox();
  let state = null;
  try {
    state = await repo.getSyncState(box);
    const since = state?.last_synced ? new Date(state.last_synced) : new Date(Date.now() - 2 * 86400000);
    const nudges = await repo.listRecentForMatching(new Date(Date.now() - 45 * 86400000));
    // Read even with no admin emails waiting, so bounce notices are still seen.
    const messages = await fetchMessagesSince(since, fetchImpl);
    const suppress = deps.suppress || require("./recipientFilter").suppress;
    let found = 0;
    let newest = since;
    for (const message of messages) {
      const received = new Date(message.receivedDateTime);
      if (received > newest) newest = received;
      const bounced = bouncedAddress(message);
      if (bounced && bounced !== box) { await suppress(bounced, String(message.subject || "Undeliverable"), "bounce").catch(() => {}); continue; }
      const from = message.from?.emailAddress?.address?.toLowerCase() || "";
      if (from === box) continue;
      const nudge = matchNudge(message, nudges);
      if (!nudge) continue;
      const reply = {
        company_id: nudge.company_id, nudge_id: nudge.id, source_message_id: message.internetMessageId || message.id,
        from_email: from, from_name: message.from?.emailAddress?.name || "", subject: String(message.subject || "").slice(0, 400),
        body_text: replyText(message.body?.content), received_at: received,
      };
      if (await repo.addReply(reply)) { found++; await onReply(nudge, reply).catch((e) => console.warn("[inbox] reply note skipped:", e.message)); }
    }
    await repo.saveSyncState(box, newest, null);
    lastRun = { at: new Date().toISOString(), found, error: null };
    return { found, checked: messages.length };
  } catch (error) {
    lastRun = { at: new Date().toISOString(), found: 0, error: explain(error.message) };
    // Keep the last good point, so the next run reads the same mail again.
    await repo.saveSyncState(box, state?.last_synced || new Date(Date.now() - 2 * 86400000), error.message.slice(0, 400)).catch(() => {});
    throw error;
  }
}

async function defaultOnReply(nudge, reply) {
  const { query } = require("../../db/connection");
  const { createPrefixedId } = require("../../utils/ids");
  const who = reply.from_name || reply.from_email;
  if (nudge.lead_id) {
    await require("../../repositories/leadRepository").createActivity({
      activity_id: await createPrefixedId("act"), company_id: nudge.company_id, lead_id: nudge.lead_id, type: "email_reply",
      description: `Email reply from ${who}: ${reply.body_text.slice(0, 500)}`, created_by: nudge.sent_by,
    });
  }
  await query(
    `INSERT INTO notifications (notif_id, company_id, user_id, title, message, type, lead_id, priority, actionable)
     VALUES (?, ?, ?, ?, ?, 'email_reply', ?, 'medium', 1)`,
    [await createPrefixedId("ntf"), nudge.company_id, nudge.sent_by, `${who} replied`, reply.body_text.slice(0, 900) || reply.subject, nudge.lead_id || null]
  );
}

module.exports = { bouncedAddress, configured, explain, mailbox, matchNudge, replyText, status, syncInbox, testConnection };
