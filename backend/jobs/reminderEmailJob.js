const meetings = require("../services/reminders/meetingReminders");
const taskReminders = require("../services/reminders/taskReminders");
const weeklyDigest = require("../services/reminders/weeklyDigest");

// Every minute: the email reminders people chose on their tasks.
// Every 10 minutes: meeting emails (when saved, and the morning of the meeting) and, on Monday, the weekly summary.
// Set REMINDER_EMAILS=off to stop all of them.
function startReminderEmailJob() {
  if (String(process.env.REMINDER_EMAILS || "").toLowerCase() === "off") return null;
  let running = false;
  let ticks = 0;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      const due = await taskReminders.sendDue(now);
      if (due.sent) console.log(`[reminders] sent ${due.sent} task reminder${due.sent === 1 ? "" : "s"}`);
      if (ticks % 10 === 0) {
        const meetingResult = await meetings.sendDue(now);
        if (meetingResult.sent) console.log(`[reminders] sent ${meetingResult.sent} meeting email${meetingResult.sent === 1 ? "" : "s"}`);
        const digest = await weeklyDigest.sendDue(now);
        if (digest.sent || digest.skipped) console.log(`[reminders] weekly summary: ${digest.sent} sent, ${digest.skipped} skipped`);
      }
    } catch (error) {
      console.error("[reminders] run failed:", error.message);
    } finally {
      ticks += 1;
      running = false;
    }
  };
  setTimeout(run, 60000).unref?.();
  const timer = setInterval(run, 60000);
  timer.unref?.();
  return timer;
}

module.exports = { startReminderEmailJob };
