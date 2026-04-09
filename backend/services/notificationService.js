const notificationRepository = require("../repositories/notificationRepository");
const { ROLES } = require("../constants/roles");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess, getAccessibleCompanyIds, isPlatformOperatorRole } = require("../utils/tenant");

async function listNotifications(auth, query) {
  const pagination = parsePagination(query);
  let companyId = null;
  let companyIds = null;

  if (auth.role === ROLES.SUPER_ADMIN) {
    companyId = query.company_id || null;
  } else if (isPlatformOperatorRole(auth.role)) {
    companyId = query.company_id || null;
    companyIds = companyId ? null : getAccessibleCompanyIds(auth);
  } else {
    companyId = auth.companyId;
  }

  if (companyId) {
    assertCompanyAccess(auth, companyId);
  }

  const userId =
    auth.role === ROLES.SUPER_ADMIN || [ROLES.ADMIN, ROLES.MANAGER, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role)
      ? query.user_id || null
      : auth.userId;

  const { rows, total } = await notificationRepository.listNotifications(
    {
      companyId,
      companyIds,
      userId,
      unreadOnly: String(query.unread_only || "") === "true",
      pagination,
    }
  );

  return buildPaginatedResult(rows, total, pagination);
}

async function markRead(auth, notifId) {
  const notification = await notificationRepository.getNotificationById(
    notifId,
    auth.role === ROLES.SUPER_ADMIN ? null : isPlatformOperatorRole(auth.role) ? null : auth.companyId,
    isPlatformOperatorRole(auth.role) ? getAccessibleCompanyIds(auth) : null
  );
  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.PLATFORM_ADMIN, ROLES.PLATFORM_MANAGER].includes(auth.role) && notification.user_id !== auth.userId) {
    throw new AppError("You can only mark your own notifications as read.", 403);
  }

  return notificationRepository.markNotificationRead(notifId, notification.company_id);
}

module.exports = {
  listNotifications,
  markRead,
};
