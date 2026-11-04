const inbox = require("../services/mail/graphInbox");

// Checks the Microsoft 365 inbox for replies every few minutes. Does nothing until the inbox is connected.
function startInboxSyncJob() {
  if (!inbox.configured() || String(process.env.MAIL_INBOX_SYNC || "").toLowerCase() === "off") return null;
  const minutes = Math.max(Number(process.env.MAIL_INBOX_SYNC_MINUTES) || 5, 2);
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await inbox.syncInbox();
      if (result.found) console.log(`[inbox] saved ${result.found} new repl${result.found === 1 ? "y" : "ies"}`);
    } catch (error) {
      console.error("[inbox] sync failed:", error.message);
    } finally {
      running = false;
    }
  };
  setTimeout(run, 30000).unref?.();
  const timer = setInterval(run, minutes * 60000);
  timer.unref?.();
  console.log(`[inbox] checking ${inbox.mailbox()} every ${minutes} minutes`);
  return timer;
}

module.exports = { startInboxSyncJob };
