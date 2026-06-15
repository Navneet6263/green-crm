const attendanceRepository = require("../../repositories/attendanceRepository");
const auditRepository = require("../../repositories/auditRepository");
const { createPrefixedId } = require("../../utils/ids");
const AppError = require("../../utils/appError");
const { buildPaginatedResult, parsePagination } = require("../../utils/pagination");
const { resolveChannel } = require("../communication/integrationResolver");
const { ROLES } = require("../../constants/roles");

function normalizeIp(rawIp = "") {
  return String(rawIp || "")
    .split(",")[0]
    .trim()
    .replace("::ffff:", "");
}

function isAllowedIp(ip, allowedIps = []) {
  return allowedIps.includes(ip);
}

async function getAttendanceStatus(auth, requestIp) {
  const capability = await resolveChannel(auth.companyId, "attendance");
  const latest = await attendanceRepository.getLatestEvent(auth.companyId, auth.userId);
  const ip = normalizeIp(requestIp);
  const allowedIps = Array.isArray(capability.config?.allowed_ips) ? capability.config.allowed_ips : [];

  return {
    enabled: capability.enabled,
    provider: capability.provider,
    mode: capability.mode,
    source: capability.source,
    reason: capability.reason || null,
    last_event: latest,
    ip_address: ip,
    ip_allowed: true, // Field agents don't need IP validation
    allowed_ip_count: allowedIps.length,
  };
}

async function listHistory(auth, query = {}) {
  const pagination = parsePagination(query);
  
  const isAdmin = [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role);
  
  let rows, total;

  if (isAdmin && typeof query.search === "string") {
    ({ rows, total } = await attendanceRepository.listAllEvents(
      auth.companyId,
      query.search.trim(),
      pagination
    ));
  } else {
    ({ rows, total } = await attendanceRepository.listUserEvents(
      auth.companyId,
      auth.userId,
      pagination
    ));
  }

  return buildPaginatedResult(rows, total, pagination);
}

async function punch(auth, payload, requestIp) {
  const nextType = String(payload.type || "").trim();
  const status = await getAttendanceStatus(auth, requestIp);

  if (!status.enabled) {
    throw new AppError("Attendance is not enabled for this company.", 403);
  }

  if (!["punch_in", "punch_out"].includes(nextType)) {
    throw new AppError("Attendance type must be punch_in or punch_out.", 400);
  }

  const event = await attendanceRepository.createAttendanceEvent({
    attendance_event_id: await createPrefixedId("att"),
    company_id: auth.companyId,
    user_id: auth.userId,
    event_type: nextType,
    ip_address: status.ip_address,
    location: payload.location || null,
  });

  await auditRepository.createLog({
    audit_id: await createPrefixedId("aud"),
    company_id: auth.companyId,
    action: `attendance.${nextType}`,
    performed_by: auth.userId,
    target_user: auth.userId,
    user_email: auth.email,
    user_role: auth.role,
    details: { ip_address: status.ip_address, location: payload.location },
  });

  return {
    event,
    status: {
      ...status,
      last_event: event,
    },
  };
}

module.exports = {
  getAttendanceStatus,
  listHistory,
  punch,
};
