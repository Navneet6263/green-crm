// A simple, explainable health score for a customer (0–100) with the reasons behind it.
const DAY = 86400000;

function customerHealth(c, now = Date.now()) {
  if (String(c.status || "active").toLowerCase() !== "active") return { score: null, level: "inactive", reasons: ["Customer is inactive"] };
  const reasons = [];
  let score = 100;
  const pending = Math.max(0, Number(c.total_value || 0) - Number(c.paid_amount || 0));
  const time = (v) => (v ? new Date(v).getTime() : null);

  if (pending > 0 && time(c.next_payment_date) && time(c.next_payment_date) < now) { score -= 40; reasons.push("Payment overdue"); }
  else if (pending > 0) { score -= 10; reasons.push("Payment pending"); }
  if (time(c.next_follow_up) && time(c.next_follow_up) < now) { score -= 15; reasons.push("Follow-up missed"); }
  const renewal = time(c.next_renewal);
  if (renewal && renewal < now) { score -= 25; reasons.push("Plan expired"); }
  else if (renewal && renewal - now < 15 * DAY) { score -= 10; reasons.push("Renewal within 15 days"); }
  const onboarded = ["done", "completed"].includes(String(c.onboarding_status || "").toLowerCase());
  if (!onboarded && time(c.created_at) && now - time(c.created_at) > 30 * DAY) { score -= 15; reasons.push("Onboarding not finished after 30 days"); }
  const last = time(c.last_interaction) || time(c.updated_at);
  if (last && now - last > 45 * DAY) { score -= 15; reasons.push("No contact in 45 days"); }

  score = Math.max(0, score);
  return { score, level: score >= 75 ? "good" : score >= 50 ? "watch" : "risk", reasons };
}

module.exports = { customerHealth };
