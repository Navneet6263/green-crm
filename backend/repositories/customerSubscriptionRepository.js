const { query } = require('../db/connection');
const { createPrefixedId } = require('../utils/ids');

class CustomerSubscriptionRepository {
  async listSubscriptions(customerId, companyId) {
    const q = `
      SELECT
        cs.id,
        cs.subscription_id,
        cs.company_id,
        cs.customer_id,
        cs.product_id,
        cs.amount,
        cs.duration_months,
        cs.start_date,
        cs.end_date,
        cs.status,
        cs.created_by,
        cs.created_at,
        cs.updated_at,
        p.name as product_name
      FROM customer_subscriptions cs
      LEFT JOIN products p ON cs.product_id = p.product_id
      WHERE cs.customer_id = ? AND cs.company_id = ?
      ORDER BY cs.created_at DESC
    `;
    const [rows] = await query(q, [customerId, companyId]);
    return rows;
  }

  async createSubscription(data) {
    const subId = await createPrefixedId('sub');
    const q = `
      INSERT INTO customer_subscriptions (
        subscription_id, company_id, customer_id, product_id,
        amount, duration_months, start_date, end_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(q, [
      subId,
      data.company_id,
      data.customer_id,
      data.product_id,
      data.amount || 0,
      data.duration_months || 1,
      data.start_date,
      data.end_date,
      data.status || 'active',
      data.created_by
    ]);

    const selectQ = `
      SELECT
        cs.*,
        p.name as product_name
      FROM customer_subscriptions cs
      LEFT JOIN products p ON cs.product_id = p.product_id
      WHERE cs.subscription_id = ?
    `;
    const [rows] = await query(selectQ, [subId]);
    return rows[0];
  }

  async getExpiringSubscriptions(companyId, daysAhead) {
    const q = `
      SELECT
        cs.subscription_id,
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
      WHERE cs.company_id = ?
        AND cs.status = 'active'
        AND c.is_active = 1
        AND DATEDIFF(day, SYSUTCDATETIME(), cs.end_date) = ?
    `;
    const [rows] = await query(q, [companyId, daysAhead]);
    return rows;
  }
}

module.exports = new CustomerSubscriptionRepository();
