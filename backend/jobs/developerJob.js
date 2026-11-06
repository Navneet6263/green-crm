const delivery = require("../services/developer/webhookDelivery");
const alerts = require("../services/developer/alerts");

// Every 30 seconds: send queued webhook calls. Every 10 minutes: tidy the queue and email admins
// about lead links, keys or webhooks that keep failing. Set DEVELOPER_JOBS=off to stop both.
function startDeveloperJob() {
  if (String(process.env.DEVELOPER_JOBS || "").toLowerCase() === "off") return null;
  let running = false;
  let ticks = 0;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const counts = await delivery.sendDue();
      if (counts.sent || counts.failed || counts.dead) {
        console.log(`[webhooks] sent ${counts.sent}, will retry ${counts.failed}, gave up ${counts.dead}`);
      }
      if (ticks % 20 === 0) {
        await delivery.tidy();
        const result = await alerts.checkAndAlert();
        if (result.sent) console.log(`[developer] sent ${result.sent} failure alert email(s)`);
      }
    } catch (error) {
      console.error("[developer] job failed:", error.message);
    } finally {
      ticks += 1;
      running = false;
    }
  };
  setTimeout(run, 45 * 1000).unref?.();
  const timer = setInterval(run, 30 * 1000);
  timer.unref?.();
  return timer;
}

module.exports = { startDeveloperJob };
