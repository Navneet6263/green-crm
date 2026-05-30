export const LIMITS_MAP = [
  ["admin", "Admins"],
  ["manager", "Managers"],
  ["sales", "Sales"],
  ["marketing", "Marketing"],
  ["support", "Support"],
  ["legal-team", "Legal Team"],
  ["finance-team", "Finance Team"],
  ["expert", "Expert Users"],
  ["viewer", "Viewer"],
];

export const BASE_ROLES = [
  ["manager", "Manager"],
  ["sales", "Sales"],
  ["marketing", "Marketing"],
  ["support", "Support"],
  ["legal-team", "Legal Team"],
  ["finance-team", "Finance Team"],
  ["expert", "Expert"],
  ["viewer", "Viewer"],
];

export const parseJson = (v) => {
  try {
    return !v ? {} : typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return {};
  }
};

export const formDraft = (cid = "", role = "sales") => ({
  company_id: cid,
  name: "",
  email: "",
  role,
  password: "",
  phone: "",
  department: "",
});

export const editDraft = (u) => ({
  name: u?.name || "",
  email: u?.email || "",
  role: u?.role || "sales",
  password: "",
  phone: u?.phone || "",
  department: u?.department || "",
});

export function buildCreateFeedback(r) {
  const delivery = r?.credential_delivery?.delivery || "preview";
  const email = r?.email || "this inbox";
  const tmp = r?.temporary_password ? ` Temp password: ${r.temporary_password}.` : "";
  const preview = r?.credential_delivery?.preview_login_url
    ? ` Login: ${r.credential_delivery.preview_login_url}.`
    : "";
  const err = r?.credential_delivery?.error ? ` Mail error: ${r.credential_delivery.error}.` : "";

  if (delivery === "email") {
    return { tone: "success", text: `User created and credentials sent to ${email}.${preview}` };
  }
  if (delivery === "queued") {
    return {
      tone: "warning",
      text: `User created for ${email}. Credentials sending in background.${tmp}${preview}`,
    };
  }
  return {
    tone: "warning",
    text: `User created for ${email}, but email not confirmed.${tmp}${preview}${err} Share password manually if needed.`,
  };
}

export function calculateStats(users) {
  return {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
    roles: new Set(users.map((u) => u.role).filter(Boolean)).size,
  };
}

export function calculateUsage(users, company) {
  const limits = parseJson(parseJson(company?.service_settings).staff_limits);
  
  return LIMITS_MAP.map(([key, label]) => {
    const used = users.filter((u) => u.is_active && u.role === key).length;
    const limit = limits[key];
    return {
      key,
      label,
      used,
      limit: limit === null || limit === undefined || limit === "" ? null : Number(limit),
    };
  });
}

export function filterUsers(users, search, roleFilter, statusFilter) {
  const q = search.trim().toLowerCase();
  return users.filter((u) => {
    const hay = [u.name, u.email, u.role, u.department, u.phone, u.talent_id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!q || hay.includes(q)) &&
      (roleFilter === "all" || u.role === roleFilter) &&
      (statusFilter === "all" || (statusFilter === "active" ? u.is_active : !u.is_active))
    );
  });
}
