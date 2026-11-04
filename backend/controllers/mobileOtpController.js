const { createMobileOtpService } = require('../services/mobileOtpService');
const { PLATFORM_COMPANY_ID } = require('../db/schema');
const { buildAuthToken } = require('../utils/auth');

const service = createMobileOtpService({
  repository: require('../repositories/mobileOtpRepository'),
  mailer: require('../services/emailService'),
  companyRepository: require('../repositories/companyRepository'),
  platformCompanyId: PLATFORM_COMPANY_ID,
  buildAuthToken,
});

exports.request = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ data: await service.request(req.body, req.ip) });
};
exports.verify = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const data = await service.verify(req.body);
  // A correct email code proves the email, the same as the web login's monthly check.
  await require('../services/auth/loginOtp').markVerified(data?.user?.user_id).catch(() => {});
  res.json({ data });
};
