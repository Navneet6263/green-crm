const PROFILE_PREFIX = "__CRM_PROFILE__:";

export function parseCustomerProfile(notes) {
  const lines = String(notes || "").split("\n");
  const profileLine = lines.find((line) => line.startsWith(PROFILE_PREFIX));

  if (!profileLine) {
    return {};
  }

  try {
    const parsed = JSON.parse(profileLine.slice(PROFILE_PREFIX.length));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

export function stripCustomerProfile(notes) {
  return String(notes || "")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith(PROFILE_PREFIX))
    .join("\n");
}

export function buildCustomerNotes(profile, baseNotes = "", existingNotes = "") {
  const cleanProfile = Object.fromEntries(
    Object.entries(profile || {}).filter(([, value]) => String(value || "").trim())
  );
  const sections = [];

  if (Object.keys(cleanProfile).length) {
    sections.push(`${PROFILE_PREFIX}${JSON.stringify(cleanProfile)}`);
  }

  const nextBaseNotes = String(baseNotes || "").trim();
  const previousNotes = stripCustomerProfile(existingNotes);

  if (nextBaseNotes) {
    sections.push(nextBaseNotes);
  } else if (previousNotes) {
    sections.push(previousNotes);
  }

  return sections.join("\n");
}

export function customerProfileSummary(profile) {
  if (!profile || typeof profile !== "object") {
    return "";
  }

  const parts = [
    profile.business_summary,
    [profile.address_city, profile.address_state].filter(Boolean).join(", "),
    profile.country,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return parts[0] || parts[1] || parts[2] || "";
}
