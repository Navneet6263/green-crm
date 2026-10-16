const router = require('express').Router();
const authenticate = require('../middlewares/authenticate');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { createRateLimiter } = require('../middlewares/rateLimiter');
const auditRepository = require('../repositories/auditRepository');
const { createPrefixedId } = require('../utils/ids');
const service = require('../services/tracking/teamTrackingService');
const { buildEmployeeWorkbook, buildTeamWorkbook } = require('../services/tracking/trackingWorkbook');

// Web dashboard view of field tracking: sales see themselves, managers their teams, admins the company.
router.use(asyncHandler(authenticate));
router.use(createRateLimiter({ windowMs: 60000, max: 90, keyGenerator: req => `team-tracking:${req.auth.companyId}:${req.auth.userId}` }));
const exportLimiter = createRateLimiter({ windowMs: 60000, max: 6, keyGenerator: req => `team-tracking-export:${req.auth.companyId}:${req.auth.userId}` });

const userIdParam = req => {
  const id = String(req.params.userId || '').trim();
  if (!id || id.length > 20) throw new AppError('Invalid employee.', 400);
  return id;
};
const dateParam = (value, fallback) => (value ? String(value) : fallback);

async function sendWorkbook(req, res, buffer, fileName, details) {
  await auditRepository.createLog({
    audit_id: await createPrefixedId('aud'),
    company_id: req.auth.companyId,
    action: 'field_tracking.exported',
    performed_by: req.auth.userId,
    user_email: req.auth.email,
    user_role: req.auth.role,
    target_user: details.target_user || null,
    details,
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(Buffer.from(buffer));
}

const safeName = value => String(value || 'employee').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'employee';

router.get('/live', asyncHandler(async (req, res) => {
  res.json({ data: await service.getLiveBoard(req.auth) });
}));

router.get('/employees/:userId/day', asyncHandler(async (req, res) => {
  res.json({ data: await service.getEmployeeDay(req.auth, userIdParam(req), dateParam(req.query.date, service.todayIst())) });
}));

router.get('/employees/:userId/export', exportLimiter, asyncHandler(async (req, res) => {
  const today = service.todayIst();
  const from = dateParam(req.query.from, today);
  const to = dateParam(req.query.to, from);
  const report = await service.getEmployeeReport(req.auth, userIdParam(req), from, to);
  const buffer = await buildEmployeeWorkbook(report, req.auth.name || req.auth.email || 'GreenCRM user');
  await sendWorkbook(req, res, buffer, `GreenCRM-field-${safeName(report.user.name)}-${from}-to-${to}.xlsx`,
    { target_user: report.user.user_id, from, to, scope: 'employee' });
}));

router.get('/export', exportLimiter, asyncHandler(async (req, res) => {
  const today = service.todayIst();
  const from = dateParam(req.query.from, today);
  const to = dateParam(req.query.to, from);
  const report = await service.getTeamReport(req.auth, from, to);
  const buffer = await buildTeamWorkbook(report, req.auth.name || req.auth.email || 'GreenCRM user');
  await sendWorkbook(req, res, buffer, `GreenCRM-team-field-report-${from}-to-${to}.xlsx`,
    { employees: report.employees.length, from, to, scope: 'team' });
}));

module.exports = router;
