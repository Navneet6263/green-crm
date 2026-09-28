# Sales app branding and email login

The launch icon and login wordmark reuse the existing GreenCRM brand assets. The
native launch screen requires a new APK/IPA. Existing password login remains.
Only sales accounts enter this app; managers/admins continue to use the web CRM.

## Enable email OTP on the backend

1. Apply `backend/db/migrations/20260924_mobile_email_otp.sql` to the CRM Microsoft
   SQL Server database. This adds two tables; it does not alter CRM business data.
2. Configure platform SMTP in the existing platform settings or backend `SMTP_*`
   environment variables. Verify the sender/domain with your email provider.
3. Generate an independent secret in a private terminal:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Set the output as backend `CRM_MOBILE_OTP_SECRET`. Never put it in the mobile
   app, Git, chat, logs, or an `EXPO_PUBLIC_*` variable.
4. Ensure the existing `AUTH_SECRET` (or `JWT_SECRET`) is a strong production
   secret of at least 32 characters. Changing it invalidates existing sessions;
   coordinate a rotation rather than replacing it casually.
5. Set backend `CRM_MOBILE_EMAIL_OTP_ENABLED=true`, deploy the backend code and
   restart every backend instance with the updated environment. Default is off.
6. Build/install the new app. Its existing API base still points to the CRM;
   there is no separate mobile server or client-side SMTP configuration.

Public endpoints (existing API base): `POST /auth/mobile-otp/request` with
`{email}`, then `POST /auth/mobile-otp/verify` with `{email, challenge_id, code}`.
Request returns only a challenge ID, expiry and resend delay, never the code.
Verify returns the existing session format with a minimal sales profile.

## Security and operational behavior

- Six-digit cryptographically random code; five-minute expiry; one successful
  use; five incorrect attempts maximum. Resending invalidates previous codes.
- HMAC digests only in SQL, using a separate secret. Per-email cooldown 60 seconds,
  max five requests per 15 minutes, and per-IP max 20 requests per 15 minutes.
  SQL locks serialize request/verify across PM2 workers. Existing auth/IP limits
  also apply; configure trusted proxies correctly, never trust arbitrary client
  IP headers. Shared office NATs may need reviewed limits at scale.
- Unknown, inactive, ambiguous and non-sales addresses get the same generic
  request response without an email. Roles/account status/tenant are rechecked
  on verification. Locked accounts and accounts configured for two-factor auth
  cannot use this passwordless flow; it is not a substitute for MFA.
- Platform SMTP is required; email preview/debug fallback is never exposed.
  Sending runs in a background callback to avoid account disclosure via SMTP
  response time. This is not a durable mail queue: a backend restart may lose an
  unsent email. The user can resend after cooldown. Monitor delivery; use a durable
  mail queue before requiring guaranteed delivery/high-volume campaigns.
- Failed email delivery invalidates its challenge. Cleanup removes expired
  challenges older than a day and stale rate windows in bounded batches.
- Disable via the feature flag to roll back OTP; password login is unchanged.
  Email login proves inbox access, not strong multi-factor authentication.

## Acceptance tests before rollout

Use a staging sales account and real SMTP: successful OTP login, wrong/expired
code, resend invalidating old code, no reuse, inactive/non-sales users, network
failure and password fallback. Test account switching and logout. Check the new
launch screen on a signed Android build; web preview cannot validate native splash
or background GPS. Re-test the tracking permission/crash case separately.

Automated local checks do not send email, migrate a live DB or compile Kotlin.
Backend: `npm run test:mobile-otp`; mobile: `npm run verify`, Expo all-platform
export and `node scripts/smoke-web.mjs` against mocked APIs.
