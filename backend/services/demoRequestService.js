const demoRequestRepository = require("../repositories/demoRequestRepository");
const { ROLES } = require("../constants/roles");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");

async function createDemoRequest(payload) {
  if (!payload.name || !payload.email) {
    throw new AppError("Name and email are required.");
  }

  return demoRequestRepository.createDemoRequest({
    name: String(payload.name).trim(),
    email: String(payload.email).trim().toLowerCase(),
    phone: payload.phone ? String(payload.phone).trim() : null,
    company: payload.company ? String(payload.company).trim() : null,
    message: payload.message || payload.requirements || null,
    status: "pending",
  });
}

async function listDemoRequests(auth, query) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can access demo requests.", 403);
  }

  const pagination = parsePagination(query);
  const { rows, total } = await demoRequestRepository.listDemoRequests({
    status: query.status || null,
    search: query.search || "",
    pagination,
  });

  return buildPaginatedResult(rows, total, pagination);
}

async function updateDemoRequest(auth, id, payload) {
  if (auth.role !== ROLES.SUPER_ADMIN) {
    throw new AppError("Only super admins can update demo requests.", 403);
  }

  return demoRequestRepository.updateDemoRequest(id, {
    status: payload.status || "pending",
  });
}

module.exports = {
  createDemoRequest,
  listDemoRequests,
  updateDemoRequest,
};
