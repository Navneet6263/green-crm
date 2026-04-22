const AppError = require("../utils/appError");
const callService = require("../services/communication/callService");
const callWebhookService = require("../services/communication/callWebhookService");
const emailDeskService = require("../services/communication/emailDeskService");
const { resolveChannel } = require("../services/communication/integrationResolver");
const { getProvider } = require("../services/communication/providerFactory");
const smsService = require("../services/communication/smsService");
const whatsappService = require("../services/communication/whatsappService");

async function send(req, res) {
  const data = await emailDeskService.sendEntityEmail(req.auth, req.body);
  res.status(201).json({ data });
}

async function sendTestEmail(req, res) {
  const data = await emailDeskService.sendTestEmail(req.auth, req.body);
  res.json({ data });
}

async function call(req, res) {
  const data = await callService.initiateCall(req.auth, req.body, req);
  res.status(201).json({ data });
}

async function sendWhatsapp(req, res) {
  const data = await whatsappService.sendMessage(req.auth, req.body);
  res.status(201).json({ data });
}

async function sendSms(req, res) {
  const data = await smsService.sendSMS(req.auth, req.body);
  res.status(201).json({ data });
}

async function handleWebhook(req, res) {
  const channel = String(req.params.channel || "").trim();
  const providerName = String(req.params.provider || "").trim();

  if (!["call", "whatsapp", "sms"].includes(channel)) {
    throw new AppError("Unsupported webhook channel.", 400);
  }

  const data =
    channel === "call"
      ? await callWebhookService.handleCallWebhook(providerName, req)
      : await handleGenericWebhook(channel, providerName, req);

  res.json({ data });
}

async function handleGenericWebhook(channel, providerName, req) {
  const provider = getProvider(channel, providerName);
  const companyId = String(req.query.company_id || req.body?.company_id || "").trim();

  if (companyId) {
    const capability = await resolveChannel(companyId, channel).catch(() => ({}));
    const verification = provider.verifyWebhook(
      { headers: req.headers || {}, rawBody: req.rawBody || "", body: req.body || {}, query: req.query || {} },
      capability.config || {}
    );

    if (verification?.valid === false) {
      throw new AppError("Webhook signature verification failed.", 401);
    }
  }

  return provider.handleWebhook(req.body || {});
}

module.exports = {
  call,
  handleWebhook,
  send,
  sendSms,
  sendTestEmail,
  sendWhatsapp,
};
