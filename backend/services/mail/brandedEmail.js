// The look of the CRM's own emails (reminders, weekly summary): the GreenCRM logo, a heading, the body and a button.
// The logo goes inside the email (cid), so it shows even when the mail app blocks outside pictures.
const path = require("node:path");
const { escapeHtml, getFrontendUrl } = require("../emailService");
const { isPermanentRejection, skipReason, suppress } = require("./recipientFilter");

const LOGO_CID = "greencrm-logo";
const LOGO = { filename: "greencrm-logo.png", path: path.join(__dirname, "../../assets/email/greencrm-logo.png"), cid: LOGO_CID };

function button(label, href, tone = "primary") {
  const style = tone === "primary"
    ? "background:#0c605d;color:#ffffff;border:1px solid #0c605d"
    : "background:#ffffff;color:#0c605d;border:1px solid #c9dcda";
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:10px 16px;border-radius:8px;${style};text-decoration:none;font-weight:bold;font-size:14px">${escapeHtml(label)}</a>`;
}

/** Full HTML for one email. `body` is already-escaped HTML. */
function layout({ preheader = "", heading, body, buttons = "" }) {
  const home = getFrontendUrl();
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f5f4">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<tr><td style="padding:22px 28px 14px;border-bottom:1px solid #eef2f1"><a href="${escapeHtml(home)}"><img src="cid:${LOGO_CID}" width="160" alt="GreenCRM" style="display:block;width:160px;height:auto;border:0"></a></td></tr>
<tr><td style="padding:22px 28px 8px"><h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a">${escapeHtml(heading)}</h1>${body}</td></tr>
${buttons ? `<tr><td style="padding:8px 28px 24px">${buttons}</td></tr>` : ""}
<tr><td style="padding:14px 28px;border-top:1px solid #eef2f1;font-size:12px;color:#94a3b8">Sent by GreenCRM. <a href="${escapeHtml(home)}" style="color:#0c605d">Open CRM</a></td></tr>
</table></td></tr></table></body></html>`;
}

/**
 * Sends one branded email if the address is worth emailing. Returns { sent, skipped }.
 * A "mailbox does not exist" answer from the mail server adds the address to the never-email list.
 */
async function sendBranded(companyId, { to, subject, text, preheader, heading, body, buttons, attachments = [] }, deps = {}) {
  const reason = await (deps.skipReason || skipReason)(to);
  if (reason) return { sent: false, skipped: reason };
  const send = deps.sendEmail || ((id, payload) => require("../communication/managedEmailService").sendManagedEmail(id, payload));
  const result = await send(companyId, { to, subject, text, html: layout({ preheader, heading, body, buttons }), attachments: [LOGO, ...attachments] });
  if (result?.error) {
    if (isPermanentRejection(result.error)) await (deps.suppress || suppress)(to, result.error, "smtp").catch(() => {});
    return { sent: false, skipped: `send failed: ${result.error}` };
  }
  return { sent: result?.delivery === "email", skipped: result?.delivery === "email" ? "" : "email is not set up" };
}

module.exports = { LOGO_CID, button, layout, sendBranded };
