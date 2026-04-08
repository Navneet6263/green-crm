const nodemailer = require("nodemailer");

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

function buildTransportConfig(company) {
  const companyHost = normalizeString(company?.smtp_host);
  const companyPort = Number(company?.smtp_port || 0);
  const companyUser = normalizeString(company?.smtp_user);
  const companyPass = normalizeString(company?.smtp_password);

  if (companyHost && companyPort && companyUser && companyPass) {
    return {
      scope: "company",
      host: companyHost,
      port: companyPort,
      secure: companyPort === 465,
      user: companyUser,
      pass: companyPass,
      from: normalizeString(process.env.SMTP_FROM || companyUser),
    };
  }

  const host = normalizeString(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 0);
  const user = normalizeString(process.env.SMTP_USER);
  const pass = normalizeString(process.env.SMTP_PASS);

  if (host && port && user && pass) {
    return {
      scope: "global",
      host,
      port,
      secure: normalizeString(process.env.SMTP_SECURE).toLowerCase() === "true" || port === 465,
      user,
      pass,
      from: normalizeString(process.env.SMTP_FROM || user),
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
      })
    );
  }

  return transporterCache.get(cacheKey);
}

async function sendEmail({ company = null, to, subject, html, text, replyTo }) {
  const transportConfig = buildTransportConfig(company);

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
      replyTo: replyTo || transportConfig.from,
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

async function sendPasswordResetEmail({ user, company, resetUrl }) {
  const companyName = company?.name || "GreenCRM";
  const safeName = escapeHtml(user?.name || "there");
  const safeCompanyName = escapeHtml(companyName);
  const safeResetUrl = escapeHtml(resetUrl);

  const result = await sendEmail({
    company,
    to: user.email,
    subject: `Reset your ${companyName} password`,
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

async function sendUserCredentialsEmail({ company, user, temporaryPassword, createdByName, talentId }) {
  const loginUrl = `${getFrontendUrl()}/login`;
  const companyName = company?.name || "GreenCRM";
  const safeName = escapeHtml(user?.name || "there");
  const safeCompanyName = escapeHtml(companyName);
  const safeEmail = escapeHtml(user?.email || "");
  const safePassword = escapeHtml(temporaryPassword || "");
  const safeRole = escapeHtml(String(user?.role || "").toUpperCase());
  const safeTalentId = escapeHtml(talentId || "");
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeCreatedBy = escapeHtml(createdByName || "GreenCRM");

  const result = await sendEmail({
    company,
    to: user.email,
    subject: `${companyName} admin credentials`,
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
      "Please change your password after your first login.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:linear-gradient(180deg,#eef6ff,#f8fafc);">
        <div style="background:#ffffff;border-radius:24px;padding:34px;border:1px solid #d9e5f3;box-shadow:0 24px 60px rgba(15,23,42,0.1);">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:#d9fbe8;color:#0f7a43;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Workspace Ready</div>
          <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.15;color:#0f172a;">Your GreenCRM admin account is ready</h1>
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
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.7;">Please sign in and change this temporary password immediately.</p>
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

module.exports = {
  getFrontendUrl,
  sendPasswordResetEmail,
  sendUserCredentialsEmail,
};
