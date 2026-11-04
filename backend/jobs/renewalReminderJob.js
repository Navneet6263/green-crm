const renewals = require("../services/renewals/renewalReminders");

// Every hour: put missing plan-end reminders on calendars, then send the ones that are due (10 days before the end).
function startRenewalReminderJob() {
  if (String(process.env.RENEWAL_REMINDERS || "").toLowerCase() === "off") return null;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await renewals.backfill();
      const { sent } = await renewals.sendDue();
      if (sent) console.log(`[renewals] sent ${sent} renewal reminder${sent === 1 ? "" : "s"}`);
    } catch (error) {
      console.error("[renewals] run failed:", error.message);
    } finally {
      running = false;
    }
  };
  setTimeout(run, 60000).unref?.();
  const timer = setInterval(run, 60 * 60000);
  timer.unref?.();
  return timer;
}

module.exports = { startRenewalReminderJob };
