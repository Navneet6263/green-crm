// SQL pieces for a customer's money, onboarding and renewal, shared by the list, the summary and the Excel.
// Every piece is fixed text; only values go in as parameters.

/** Joins that add pay.*, onb.* and ren.* to a query over `customers c`. */
const MONEY_APPLY = `
  OUTER APPLY (
    SELECT COALESCE(SUM(cp.amount), 0) AS paid_amount, MAX(cp.paid_on) AS last_paid_at, COUNT(*) AS payment_count
    FROM customer_payments cp
    WHERE cp.company_id = c.company_id AND cp.customer_id = c.customer_id AND cp.deleted_at IS NULL
  ) pay
  OUTER APPLY (
    SELECT COUNT(*) AS steps_total, COALESCE(SUM(CASE WHEN s.is_done = 1 THEN 1 ELSE 0 END), 0) AS steps_done
    FROM customer_onboarding_steps s
    WHERE s.company_id = c.company_id AND s.customer_id = c.customer_id
  ) onb
  OUTER APPLY (
    SELECT MIN(cs.end_date) AS next_renewal, COUNT(*) AS active_plans
    FROM customer_subscriptions cs
    WHERE cs.company_id = c.company_id AND cs.customer_id = c.customer_id AND cs.status = 'active'
  ) ren`;

const PENDING = "(COALESCE(c.total_value, 0) - pay.paid_amount)";
const PAY_OVERDUE = `(${PENDING} > 0 AND c.next_payment_date < SYSUTCDATETIME())`;
const RENEWAL_SOON = "(ren.next_renewal >= SYSUTCDATETIME() AND ren.next_renewal < DATEADD(day, 30, SYSUTCDATETIME()))";
const RENEWAL_EXPIRED = "(ren.next_renewal < SYSUTCDATETIME())";
const FOLLOW_OVERDUE = "(c.next_follow_up < SYSUTCDATETIME())";
const ONB = {
  pending: "(COALESCE(c.onboarding_status, 'pending') = 'pending')",
  "in-progress": "(c.onboarding_status IN ('in-progress', 'training'))",
  done: "(c.onboarding_status IN ('done', 'completed'))",
};
// Needs attention: money overdue, a missed follow-up, or a lapsed plan.
const ATTENTION = `(${PAY_OVERDUE} OR ${FOLLOW_OVERDUE} OR ${RENEWAL_EXPIRED})`;

const MONEY_COLUMNS = `,
  pay.paid_amount, pay.last_paid_at, pay.payment_count,
  CASE WHEN ${PENDING} > 0 THEN ${PENDING} ELSE 0 END AS pending_amount,
  onb.steps_total AS onboarding_steps_total, onb.steps_done AS onboarding_steps_done,
  ren.next_renewal, ren.active_plans`;

const FILTERS = {
  payment: { pending: `${PENDING} > 0`, overdue: PAY_OVERDUE, paid: `(COALESCE(c.total_value, 0) > 0 AND ${PENDING} <= 0)`, none: "COALESCE(c.total_value, 0) = 0" },
  onboarding: ONB,
  renewal: { soon: RENEWAL_SOON, expired: RENEWAL_EXPIRED },
  attention: { yes: ATTENTION },
};

/** Adds the money/onboarding/renewal filters (only known values) to a WHERE list. */
function moneyConditions(filters) {
  return Object.keys(FILTERS).map((key) => FILTERS[key][filters[key]]).filter(Boolean);
}

const SUMMARY_COLUMNS = `,
  COALESCE(SUM(pay.paid_amount), 0) AS collected,
  COALESCE(SUM(CASE WHEN ${PENDING} > 0 THEN ${PENDING} ELSE 0 END), 0) AS pending_amount,
  COALESCE(SUM(CASE WHEN ${PENDING} > 0 THEN 1 ELSE 0 END), 0) AS pending_count,
  COALESCE(SUM(CASE WHEN ${PAY_OVERDUE} THEN 1 ELSE 0 END), 0) AS payment_overdue,
  COALESCE(SUM(CASE WHEN ${ONB.pending} THEN 1 ELSE 0 END), 0) AS onboarding_pending,
  COALESCE(SUM(CASE WHEN ${ONB["in-progress"]} THEN 1 ELSE 0 END), 0) AS onboarding_in_progress,
  COALESCE(SUM(CASE WHEN ${ONB.done} THEN 1 ELSE 0 END), 0) AS onboarding_done,
  COALESCE(SUM(CASE WHEN ${RENEWAL_SOON} THEN 1 ELSE 0 END), 0) AS renewals_soon,
  COALESCE(SUM(CASE WHEN ${RENEWAL_EXPIRED} THEN 1 ELSE 0 END), 0) AS renewals_expired,
  COALESCE(SUM(CASE WHEN ${ATTENTION} THEN 1 ELSE 0 END), 0) AS attention`;

module.exports = { FILTERS, MONEY_APPLY, MONEY_COLUMNS, SUMMARY_COLUMNS, moneyConditions };
