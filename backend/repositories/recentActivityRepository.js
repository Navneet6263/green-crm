const { query } = require('../db/connection');

class RecentActivityRepository {
  /**
   * Get recent notes across leads and customers
   * @param {string} companyId 
   * @param {object} options - { limit, type: 'all'|'leads'|'customers', userId }
   */
  async getRecentNotes(companyId, options = {}) {
    const { limit = 20, type = 'all', userId = null } = options;

    let unionQuery = '';

    // Lead notes query
    if (type === 'all' || type === 'leads') {
      unionQuery += `
        SELECT TOP ${limit}
          'lead' as note_type,
          ln.id,
          ln.company_id,
          ln.lead_id as entity_id,
          NULL as customer_id,
          ln.content,
          ln.created_by,
          ln.created_at,
          ln.updated_at,
          u.name as created_by_name,
          u.role as created_by_role,
          l.contact_person as entity_name,
          l.company_name as entity_company_name,
          l.status as entity_status
        FROM lead_notes ln
        LEFT JOIN users u ON ln.created_by = u.user_id
        LEFT JOIN leads l ON ln.lead_id = l.lead_id
        WHERE ln.company_id = ?
          AND l.is_active = 1
      `;

      if (userId) {
        unionQuery += ` AND ln.created_by = ?`;
      }
    }

    // Customer notes query
    if (type === 'all' || type === 'customers') {
      if (unionQuery) {
        unionQuery += ' UNION ALL ';
      }

      unionQuery += `
        SELECT TOP ${limit}
          'customer' as note_type,
          cn.id,
          cn.company_id,
          NULL as entity_id,
          cn.customer_id,
          cn.content,
          cn.created_by,
          cn.created_at,
          cn.updated_at,
          u.name as created_by_name,
          u.role as created_by_role,
          c.name as entity_name,
          c.company_name as entity_company_name,
          c.status as entity_status
        FROM customer_notes cn
        LEFT JOIN users u ON cn.created_by = u.user_id
        LEFT JOIN customers c ON cn.customer_id = c.customer_id
        WHERE cn.company_id = ?
          AND c.is_active = 1
      `;

      if (userId) {
        unionQuery += ` AND cn.created_by = ?`;
      }
    }

    // Wrap in outer query to order and limit
    const finalQuery = `
      SELECT TOP ${limit} *
      FROM (
        ${unionQuery}
      ) combined
      ORDER BY created_at DESC
    `;

    // Build params array
    const params = [];
    if (type === 'all') {
      params.push(companyId);
      if (userId) params.push(userId);
      params.push(companyId);
      if (userId) params.push(userId);
    } else if (type === 'leads') {
      params.push(companyId);
      if (userId) params.push(userId);
    } else if (type === 'customers') {
      params.push(companyId);
      if (userId) params.push(userId);
    }

    const [rows] = await query(finalQuery, params);
    return rows;
  }

  /**
   * Get recent notes for a specific user (their own notes only)
   */
  async getMyRecentNotes(companyId, userId, options = {}) {
    return this.getRecentNotes(companyId, { ...options, userId });
  }

  /**
   * Get statistics about recent activity
   */
  async getActivityStats(companyId, days = 7) {
    const queryText = `
      SELECT
        (SELECT COUNT(*) FROM lead_notes ln
         INNER JOIN leads l ON ln.lead_id = l.lead_id
         WHERE ln.company_id = ? 
           AND l.is_active = 1
           AND ln.created_at >= DATEADD(day, -?, SYSUTCDATETIME())
        ) as lead_notes_count,
        (SELECT COUNT(*) FROM customer_notes cn
         INNER JOIN customers c ON cn.customer_id = c.customer_id
         WHERE cn.company_id = ? 
           AND c.is_active = 1
           AND cn.created_at >= DATEADD(day, -?, SYSUTCDATETIME())
        ) as customer_notes_count,
        (SELECT COUNT(DISTINCT ln.created_by) FROM lead_notes ln
         INNER JOIN leads l ON ln.lead_id = l.lead_id
         WHERE ln.company_id = ? 
           AND l.is_active = 1
           AND ln.created_at >= DATEADD(day, -?, SYSUTCDATETIME())
        ) as active_users_on_leads,
        (SELECT COUNT(DISTINCT cn.created_by) FROM customer_notes cn
         INNER JOIN customers c ON cn.customer_id = c.customer_id
         WHERE cn.company_id = ? 
           AND c.is_active = 1
           AND cn.created_at >= DATEADD(day, -?, SYSUTCDATETIME())
        ) as active_users_on_customers
    `;

    const [rows] = await query(queryText, [
      companyId, days,
      companyId, days,
      companyId, days,
      companyId, days
    ]);

    return rows[0] || {
      lead_notes_count: 0,
      customer_notes_count: 0,
      active_users_on_leads: 0,
      active_users_on_customers: 0
    };
  }
}

module.exports = new RecentActivityRepository();
