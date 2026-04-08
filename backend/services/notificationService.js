const notificationRepository = require("../repositories/notificationRepository");
const { ROLES } = require("../constants/roles");
const { buildPaginatedResult, parsePagination } = require("../utils/pagination");
const AppError = require("../utils/appError");
const { assertCompanyAccess } = require("../utils/tenant");

async function listNotifications(auth, query) {
  const pagination = parsePagination(query);
  const companyId = auth.role === ROLES.SUPER_ADMIN ? query.company_id || auth.companyId : auth.companyId;
  assertCompanyAccess(auth, companyId);

  const userId =
    auth.role === ROLES.SUPER_ADMIN || [ROLES.ADMIN, ROLES.MANAGER].includes(auth.role)
      ? query.user_id || null
      : auth.userId;

  const { rows, total } = await notificationRepository.listNotifications(
    {
      companyId,
      userId,
      unreadOnly: String(query.unread_only || "") === "true",
      pagination,
    }
  );

  return buildPaginatedResult(rows, total, pagination);
}

async function markRead(auth, notifId) {
  const notification = await notificationRepository.getNotificationById(notifId, auth.companyId);
  if (!notification) {
    throw new AppError("Notification not found.", 404);
  }

  if (![ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER].includes(auth.role) && notification.user_id !== auth.userId) {
    throw new AppError("You can only mark your own notifications as read.", 403);
  }

  return notificationRepository.markNotificationRead(notifId, notification.company_id);
}

module.exports = {
  listNotifications,
  markRead,
};
