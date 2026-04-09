const nodemailer = require("nodemailer");

const {
  normalizeAuthDelivery,
  normalizeSmtpProfile,
  parseCompanySettings,
} = require("../utils/companySettings");

const transporterCache = new Map();

function normalizeString(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getFrontendUrl() {
  return normalizeString(process.env.FRONTEND_URL || process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function convertTextToHtml(value) {
  return escapeHtml(value || "").replace(/\n/g, "<br />");
}

function escapeHeaderName(value) {
  return normalizeString(value).replace(/"/g, "");
}

function buildFromHeader(email, name) {
  const normalizedEmail = normalizeString(email);
  const normalizedName = escapeHeaderName(name);

  if (!normalizedEmail) {
    return null;
  }

  return normalizedName ? `"${normalizedName}" <${normalizedEmail}>` : normalizedEmail;
}

function resolveSettings(company, platformCompany) {
  return {
    companySettings: parseCompanySettings(company?.service_settings),
    platformSettings: parseCompanySettings(platformCompany?.service_settings),
  };
}

function resolveAuthDelivery(company, platformCompany) {
  const { companySettings, platformSettings } = resolveSettings(company, platformCompany);
  const companyDelivery = normalizeAuthDelivery(companySettings.auth_delivery);
  const platformDelivery = normalizeAuthDelivery(platformSettings.auth_delivery);

  return {
    login_url: companyDelivery.login_url || platformDelivery.login_url || null,
    credentials_subject:
      companyDelivery.credentials_subject || platformDelivery.credentials_subject || null,
    credentials_heading:
      companyDelivery.credentials_heading || platformDelivery.credentials_heading || null,
    credentials_note: companyDelivery.credentials_note || platformDelivery.credentials_note || null,
    reset_subject: companyDelivery.reset_subject || platformDelivery.reset_subject || null,
  };
}

function getLoginUrl(company, platformCompany) {
  return normalizeString(resolveAuthDelivery(company, platformCompany).login_url) || `${getFrontendUrl()}/login`;
}

function buildPasswordResetUrl(company, platformCompany, token) {
  const fallbackBase = getFrontendUrl();
  const loginUrl = getLoginUrl(company, platformCompany);

  try {
    const parsed = new URL(loginUrl);
    return `${parsed.origin}/reset-password?token=${encodeURIComponent(token)}`;
  } catch (_error) {
    return `${fallbackBase}/reset-password?token=${encodeURIComponent(token)}`;
  }
}

function resolveSmtpProfile(company, platformCompany) {
  const { companySettings, platformSettings } = resolveSettings(company, platformCompany);
  const companyProfile = normalizeSmtpProfile(companySettings.smtp_profile);
  const platformProfile = normalizeSmtpProfile(platformSettings.smtp_profile);

  return {
    from_email: companyProfile.from_email || platformProfile.from_email || null,
    from_name: companyProfile.from_name || platformProfile.from_name || null,
    reply_to: companyProfile.reply_to || platformProfile.reply_to || null,
  };
}

function parseTimeout(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function shouldWaitForCredentialEmail() {
  return ["1", "true", "yes", "on"].includes(
    normalizeString(process.env.CREDENTIAL_EMAIL_WAIT_FOR_DELIVERY).toLowerCase()
  );
}

function getTransportTimeouts() {
  return {
    connectionTimeout: parseTimeout(process.env.SMTP_CONNECTION_TIMEOUT_MS, 3500),
    greetingTimeout: parseTimeout(process.env.SMTP_GREETING_TIMEOUT_MS, 3500),
    socketTimeout: parseTimeout(process.env.SMTP_SOCKET_TIMEOUT_MS, 5000),
  };
}

function buildTransportConfig(company, platformCompany) {
  const smtpProfile = resolveSmtpProfile(company, platformCompany);
  const companyHost = normalizeString(company?.smtp_host);
  const companyPort = Number(company?.smtp_port || 0);
  const companyUser = normalizeString(company?.smtp_user);
  const companyPass = normalizeString(company?.smtp_password);

  if (companyHost && companyPort && companyUser && companyPass) {
    const fromEmail = smtpProfile.from_email || normalizeString(process.env.SMTP_FROM || companyUser);

    return {
      scope: "company",
      host: companyHost,
      port: companyPort,
      secure: companyPort === 465,
      user: companyUser,
      pass: companyPass,
      from: buildFromHeader(fromEmail, smtpProfile.from_name) || fromEmail,
      replyTo: smtpProfile.reply_to || fromEmail,
    };
  }

  const host = normalizeString(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 0);
  const user = normalizeString(process.env.SMTP_USER);
  const pass = normalizeString(process.env.SMTP_PASS);

  if (host && port && user && pass) {
    const fromEmail = smtpProfile.from_email || normalizeString(process.env.SMTP_FROM || user);

    return {
      scope: "global",
      host,
      port,
      secure: normalizeString(process.env.SMTP_SECURE).toLowerCase() === "true" || port === 465,
      user,
      pass,
      from: buildFromHeader(fromEmail, smtpProfile.from_name) || fromEmail,
      replyTo: smtpProfile.reply_to || fromEmail,
    };
  }

  return null;
}

function getTransporter(config) {
  const cacheKey = JSON.stringify([config.host, config.port, config.secure, config.user, config.from]);

  if (!transporterCache.has(cacheKey)) {
    transporterCache.set(
      cacheKey,
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        ...getTransportTimeouts(),
      })
    );
  }

  return transporterCache.get(cacheKey);
}

async function sendEmail({ company = null, platformCompany = null, to, subject, html, text, replyTo }) {
  const transportConfig = buildTransportConfig(company, platformCompany);

  if (!transportConfig) {
    return {
      delivery: "preview",
      provider: "preview",
      message_id: null,
    };
  }

  try {
    const transporter = getTransporter(transportConfig);
    const info = await transporter.sendMail({
      from: transportConfig.from,
      to,
      subject,
      html,
      text,
      replyTo: replyTo || transportConfig.replyTo || transportConfig.from,
    });

    return {
      delivery: "email",
      provider: transportConfig.scope,
      message_id: info.messageId || null,
    };
  } catch (error) {
    console.error("[email] delivery failed:", error.message);

    return {
      delivery: "preview",
      provider: "preview-fallback",
      message_id: null,
      error: error.message,
    };
  }
}

async function sendCustomEmail({ company = null, platformCompany = null, to, subject, body, heading = "GreenCRM" }) {
  const safeHeading = escapeHtml(heading);
  const safeBody = convertTextToHtml(body);

  return sendEmail({
    company,
    platformCompany,
    to,
    subject,
    text: body,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#f3f6fb;">
        <div style="background:#ffffff;border-radius:22px;padding:32px;border:1px solid #dbe4ef;box-shadow:0 24px 60px rgba(15,23,42,0.08);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#e5f3ff;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${safeHeading}</div>
          <div style="margin-top:18px;color:#334155;font-size:15px;line-height:1.8;">${safeBody}</div>
        </div>
      </div>
    `,
  });
}

async function sendSmtpTestEmail({ company = null, platformCompany = null, to, requestedByName = "GreenCRM" }) {
  return sendCustomEmail({
    company,
    platformCompany,
    to,
    subject: "GreenCRM SMTP test",
    heading: "SMTP Test",
    body: `Hi,\n\nThis is a GreenCRM SMTP test email triggered by ${requestedByName}.\n\nIf you received this, the current mail routing is working.`,
  });
}

async function sendPasswordResetEmail({ user, company, platformCompany, resetUrl }) {
  const companyName = company?.name || "GreenCRM";
  const authDelivery = resolveAuthDelivery(company, platformCompany);
  const safeName = escapeHtml(user?.name || "there");
  const safeCompanyName = escapeHtml(companyName);
  const safeResetUrl = escapeHtml(resetUrl);
  const subject = authDelivery.reset_subject || `Reset your ${companyName} password`;

  const result = await sendEmail({
    company,
    platformCompany,
    to: user.email,
    subject,
    text: [
      `Hi ${user?.name || "there"},`,
      "",
      `We received a password reset request for your ${company?.name || "GreenCRM"} account.`,
      `Open this link to choose a new password: ${resetUrl}`,
      "",
      "This link expires in 30 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f5f7fb;">
        <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #dbe4ef;box-shadow:0 20px 50px rgba(15,23,42,0.08);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#d9fbe8;color:#0f7a43;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Password Reset</div>
          <h1 style="margin:18px 0 12px;font-size:28px;line-height:1.2;color:#0f172a;">Reset your workspace password</h1>
          <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.7;">Hi ${safeName},</p>
          <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">We received a request to reset your password for <strong>${safeCompanyName}</strong>.</p>
          <a href="${safeResetUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:700;">Reset Password</a>
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.7;">This link expires in 30 minutes. If you did not request a reset, you can safely ignore this email.</p>
          <p style="margin:18px 0 0;padding:14px 16px;border-radius:12px;background:#f8fafc;color:#475569;font-size:12px;word-break:break-all;">${safeResetUrl}</p>
        </div>
      </div>
    `,
  });

  if (result.delivery !== "email") {
    return {
      ...result,
      preview_reset_url: resetUrl,
    };
  }

  return result;
}

async function sendUserCredentialsEmail({
  company,
  platformCompany,
  user,
  temporaryPassword,
  createdByName,
  talentId,
}) {
  const authDelivery = resolveAuthDelivery(company, platformCompany);
  const loginUrl = getLoginUrl(company, platformCompany);
  const companyName = company?.name || "GreenCRM";
  const safeName = escapeHtml(user?.name || "there");
  const safeCompanyName = escapeHtml(companyName);
  const safeEmail = escapeHtml(user?.email || "");
  const safePassword = escapeHtml(temporaryPassword || "");
  const safeRole = escapeHtml(String(user?.role || "").toUpperCase());
  const safeTalentId = escapeHtml(talentId || "");
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeCreatedBy = escapeHtml(createdByName || "GreenCRM");
  const safeHeading = escapeHtml(authDelivery.credentials_heading || "Your GreenCRM account is ready");
  const safeNote = escapeHtml(
    authDelivery.credentials_note || "Please sign in and change this temporary password immediately."
  );
  const subject = authDelivery.credentials_subject || `${companyName} login credentials`;

  const result = await sendEmail({
    company,
    platformCompany,
    to: user.email,
    subject,
    text: [
      `Hi ${user?.name || "there"},`,
      "",
      `${safeCreatedBy} created your GreenCRM workspace for ${company?.name || "your company"}.`,
      `Login URL: ${loginUrl}`,
      `Email: ${user?.email || ""}`,
      `Temporary Password: ${temporaryPassword || ""}`,
      `Role: ${String(user?.role || "").toUpperCase()}`,
      talentId ? `Talent ID: ${talentId}` : null,
      "",
      authDelivery.credentials_note || "Please sign in and change this temporary password immediately.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:linear-gradient(180deg,#eef6ff,#f8fafc);">
        <div style="background:#ffffff;border-radius:24px;padding:34px;border:1px solid #d9e5f3;box-shadow:0 24px 60px rgba(15,23,42,0.1);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#d9fbe8;color:#0f7a43;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Workspace Ready</div>
          <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.15;color:#0f172a;">${safeHeading}</h1>
          <p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.7;">Hi ${safeName},</p>
          <p style="margin:0 0 22px;color:#334155;font-size:15px;line-height:1.7;">${safeCreatedBy} created a company workspace for <strong>${safeCompanyName}</strong>. Use the credentials below to sign in.</p>

          <div style="display:grid;gap:12px;margin:0 0 20px;">
            <div style="padding:16px 18px;border-radius:16px;background:#0f172a;color:#ffffff;">
              <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;">Company</div>
              <div style="margin-top:6px;font-size:18px;font-weight:700;">${safeCompanyName}</div>
            </div>
            <div style="padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #dbe4ef;">
              <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Login Email</div>
              <div style="margin-top:6px;font-size:16px;font-weight:700;color:#0f172a;">${safeEmail}</div>
            </div>
            <div style="padding:18px;border-radius:16px;background:#f8fafc;border:1px solid #dbe4ef;">
              <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Temporary Password</div>
              <div style="margin-top:6px;font-size:16px;font-weight:700;color:#0f172a;font-family:Consolas,monospace;">${safePassword}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
              <div style="padding:16px;border-radius:16px;background:#f8fafc;border:1px solid #dbe4ef;">
                <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Role</div>
                <div style="margin-top:6px;font-size:15px;font-weight:700;color:#0f172a;">${safeRole}</div>
              </div>
              <div style="padding:16px;border-radius:16px;background:#f8fafc;border:1px solid #dbe4ef;">
                <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Talent ID</div>
                <div style="margin-top:6px;font-size:15px;font-weight:700;color:#0f172a;">${safeTalentId || "Generated on login"}</div>
              </div>
            </div>
          </div>

          <a href="${safeLoginUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#0f7a43;color:#ffffff;text-decoration:none;font-weight:700;">Open Login</a>
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.7;">${safeNote}</p>
          <p style="margin:18px 0 0;padding:14px 16px;border-radius:12px;background:#f8fafc;color:#475569;font-size:12px;word-break:break-all;">${safeLoginUrl}</p>
        </div>
      </div>
    `,
  });

  if (result.delivery !== "email") {
    return {
      ...result,
      preview_login_url: loginUrl,
    };
  }

  return result;
}

function queueEmailJob(label, handler) {
  setImmediate(async () => {
    try {
      await handler();
    } catch (error) {
      console.error(`[email] ${label} failed:`, error.message);
    }
  });
}

async function dispatchUserCredentialsEmail(payload) {
  const loginUrl = getLoginUrl(payload.company, payload.platformCompany);
  const transportConfig = buildTransportConfig(payload.company, payload.platformCompany);

  if (!transportConfig) {
    return {
      delivery: "preview",
      provider: "preview",
      message_id: null,
      preview_login_url: loginUrl,
    };
  }

  if (shouldWaitForCredentialEmail()) {
    return sendUserCredentialsEmail(payload);
  }

  queueEmailJob(`credentials:${payload.user?.email || "unknown"}`, () => sendUserCredentialsEmail(payload));

  return {
    delivery: "queued",
    provider: "background",
    message_id: null,
    preview_login_url: loginUrl,
  };
}

module.exports = {
  buildPasswordResetUrl,
  dispatchUserCredentialsEmail,
  getFrontendUrl,
  getLoginUrl,
  resolveAuthDelivery,
  sendCustomEmail,
  sendEmail,
  sendPasswordResetEmail,
  sendSmtpTestEmail,
  sendUserCredentialsEmail,
};
