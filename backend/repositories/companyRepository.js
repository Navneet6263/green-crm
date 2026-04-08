const db = require("../db/connection");
const { PLATFORM_COMPANY_ID } = require("../db/schema");

function getExecutor(executor) {
  return executor || db;
}

async function getCompanyById(companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM companies WHERE company_id = ?", [companyId]);
  return rows[0] || null;
}

async function getCompanyBySlug(slug, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query("SELECT TOP 1 * FROM companies WHERE slug = ?", [slug]);
  return rows[0] || null;
}

async function getCompanyWithSettings(companyId, executor) {
  return getCompanyById(companyId, executor);
}

async function listCompanies({ search, pagination }, executor) {
  const active = getExecutor(executor);
  const conditions = ["company_id <> ?"];
  const params = [PLATFORM_COMPANY_ID];

  if (search) {
    conditions.push("(name LIKE ? OR slug LIKE ? OR admin_email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM companies ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT *
      FROM companies
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function createCompany(company, executor) {
  const active = getExecutor(executor);

  await active.query(
    `
      INSERT INTO companies (
        company_id,
        name,
        slug,
        contact_email,
        admin_email,
        contact_phone,
        industry,
        status,
        settings_currency,
        settings_timezone,
        settings_date_format,
        country,
        website
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      company.company_id,
      company.name,
      company.slug,
      company.contact_email || company.admin_email || "",
      company.admin_email || "",
      company.contact_phone || null,
      company.industry || null,
      company.status || "trial",
      company.settings_currency || "INR",
      company.settings_timezone || "Asia/Kolkata",
      company.settings_date_format || "DD/MM/YYYY",
      company.country || "India",
      company.website || null,
    ]
  );

  return getCompanyById(company.company_id, active);
}

async function updateCompany(companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  [
    "name",
    "contact_email",
    "admin_email",
    "contact_phone",
    "industry",
    "status",
    "website",
    "country",
    "settings_currency",
    "settings_timezone",
    "settings_date_format",
    "branding_primary_color",
    "branding_logo_url",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
  ].forEach((column) => {
    if (Object.prototype.hasOwnProperty.call(updates, column)) {
      fields.push(`${column} = ?`);
      params.push(updates[column] ?? null);
    }
  });

  if (Object.prototype.hasOwnProperty.call(updates, "service_access")) {
    fields.push("service_access = ?");
    params.push(JSON.stringify(updates.service_access || {}));
  }

  if (Object.prototype.hasOwnProperty.call(updates, "service_settings")) {
    fields.push("service_settings = ?");
    params.push(JSON.stringify(updates.service_settings || {}));
  }

  if (fields.length) {
    await active.query(
      `UPDATE companies SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?`,
      [...params, companyId]
    );
  }

  return getCompanyById(companyId, active);
}

module.exports = {
  createCompany,
  getCompanyById,
  getCompanyBySlug,
  getCompanyWithSettings,
  listCompanies,
  updateCompany,
};
