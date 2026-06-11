const customerSubscriptionRepository = require('../repositories/customerSubscriptionRepository');
const notificationService = require('../services/notificationService');
const db = require('../db/connection');

async function processExpiringSubscriptions(daysAhead = 10) {
  try {
    const q = `
      SELECT
        cs.subscription_id,
        cs.company_id,
        cs.customer_id,
        cs.product_id,
        cs.end_date,
        cs.amount,
        p.name as product_name,
        c.name as customer_name,
        c.company_name,
        c.assigned_to
      FROM customer_subscriptions cs
      JOIN customers c ON cs.customer_id = c.customer_id
      JOIN products p ON cs.product_id = p.product_id
      WHERE cs.status = 'active'
        AND c.is_active = 1
        AND DATEDIFF(day, SYSUTCDATETIME(), cs.end_date) = ?
    `;
    const [expiring] = await db.query(q, [daysAhead]);
    
    for (const sub of expiring) {
      if (!sub.assigned_to) continue;
      
      const message = `Customer ${sub.company_name} subscription for ${sub.product_name} is expiring in ${daysAhead} days (on ${new Date(sub.end_date).toLocaleDateString()}). Please collect payment of ₹${sub.amount}.`;
      
      await notificationService.createNotification(
        sub.company_id,
        sub.assigned_to,
        "subscription_expiring",
        message,
        `/customers/${sub.customer_id}`
      );
    }
    
    console.log(`[SUBSCRIPTION JOB] Processed ${expiring.length} expiring subscriptions.`);
  } catch (error) {
    console.error('[SUBSCRIPTION JOB ERROR] Failed to process expiring subscriptions:', error);
  }
}

function startSubscriptionExpiryJob() {
  console.log("[SUBSCRIPTION JOB] Starting subscription expiry scheduler (runs every 24 hours)...");
  
  // Run once immediately on startup
  setTimeout(() => {
    processExpiringSubscriptions(10)
      .then(() => console.log("[SUBSCRIPTION JOB] Initial check completed."))
      .catch((err) => console.error("[SUBSCRIPTION JOB ERROR] Initial check failed:", err));
  }, 10000); // Wait 10 seconds after startup

  // Schedule to run every 24 hours
  const INTERVAL_24H = 24 * 60 * 60 * 1000;
  const intervalId = setInterval(() => {
    processExpiringSubscriptions(10)
      .then(() => console.log("[SUBSCRIPTION JOB] Scheduled run completed."))
      .catch((err) => console.error("[SUBSCRIPTION JOB ERROR] Scheduled run failed:", err));
  }, INTERVAL_24H);

  intervalId.unref();
}

module.exports = {
  startSubscriptionExpiryJob
};
