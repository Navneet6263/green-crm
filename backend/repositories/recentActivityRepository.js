const { query } = require('../db/connection');

class RecentActivityRepository {
  /**
   * Get recent notes across leads and customers
   * @param {string} companyId 
   * @param {object} options - { limit, type: 'all'|'leads'|'customers', userId, userIds, productIds }
   */
  async getRecentNotes(companyId, options = {}) {
    const { limit = 20, type = 'all', userId = null, userIds = [], productIds = [], fromDate, toDate, search = '', sort = 'recent' } = options;

    let unionQuery = '';
    const params = [];
    
    // Normalize user filters
    const usersToFilter = [];
    if (userId) usersToFilter.push(userId);
    if (Array.isArray(userIds)) usersToFilter.push(...userIds);
    const uniqueUsers = [...new Set(usersToFilter)];

    // Lead notes query
    if (type === 'all' || type === 'leads') {
      let leadQuery = `
        SELECT
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
          l.status as entity_status,
          l.email,
          l.phone,
          l.requirements,
          l.lost_reason,
          l.legal_approved_by,
          l.legal_approved_at,
          p.product_id,
          p.name as product_name
        FROM lead_notes ln
        LEFT JOIN users u ON ln.created_by = u.user_id
        LEFT JOIN leads l ON ln.lead_id = l.lead_id
        LEFT JOIN products p ON l.product_id = p.product_id
        WHERE ln.company_id = ?
          AND l.is_active = 1
      `;
      params.push(companyId);

      if (uniqueUsers.length > 0) {
        leadQuery += ` AND ln.created_by IN (${uniqueUsers.map(() => '?').join(',')})`;
        params.push(...uniqueUsers);
      }
      if (Array.isArray(productIds) && productIds.length > 0) {
        leadQuery += ` AND l.product_id IN (${productIds.map(() => '?').join(',')})`;
        params.push(...productIds);
      }
      if (fromDate) {
        leadQuery += ` AND ln.created_at >= ?`;
        params.push(fromDate);
      }
      if (toDate) {
        leadQuery += ` AND ln.created_at <= ?`;
        params.push(toDate);
      }
      if (search) {
        leadQuery += ` AND (ln.content LIKE ? OR l.company_name LIKE ? OR l.contact_person LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      
      unionQuery += leadQuery;
    }

    // Customer notes query
    if (type === 'all' || type === 'customers') {
      if (unionQuery) {
        unionQuery += ' UNION ALL ';
      }

      let customerQuery = `
        SELECT
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
          c.status as entity_status,
          c.email,
          c.phone,
          NULL as requirements,
          NULL as lost_reason,
          NULL as legal_approved_by,
          NULL as legal_approved_at,
          p.product_id,
          p.name as product_name
        FROM customer_notes cn
        LEFT JOIN users u ON cn.created_by = u.user_id
        LEFT JOIN customers c ON cn.customer_id = c.customer_id
        LEFT JOIN products p ON c.product_id = p.product_id
        WHERE cn.company_id = ?
          AND c.is_active = 1
      `;
      params.push(companyId);

      if (uniqueUsers.length > 0) {
        customerQuery += ` AND cn.created_by IN (${uniqueUsers.map(() => '?').join(',')})`;
        params.push(...uniqueUsers);
      }
      if (Array.isArray(productIds) && productIds.length > 0) {
        customerQuery += ` AND c.product_id IN (${productIds.map(() => '?').join(',')})`;
        params.push(...productIds);
      }
      if (fromDate) {
        customerQuery += ` AND cn.created_at >= ?`;
        params.push(fromDate);
      }
      if (toDate) {
        customerQuery += ` AND cn.created_at <= ?`;
        params.push(toDate);
      }
      if (search) {
        customerQuery += ` AND (cn.content LIKE ? OR c.company_name LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      unionQuery += customerQuery;
    }

    const page = Math.max(parseInt(options.page) || 1, 1);
    const limitVal = Math.min(parseInt(limit) || 20, 10000);
    const offset = (page - 1) * limitVal;
    const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';

    const countQuery = `SELECT COUNT(*) as total FROM (${unionQuery}) combined`;
    const [countRows] = await query(countQuery, params);
    const total = countRows[0]?.total || 0;

    const dataQuery = `
      SELECT *
      FROM (
        ${unionQuery}
      ) combined
      ORDER BY created_at ${sortOrder}
      OFFSET ${offset} ROWS FETCH NEXT ${limitVal} ROWS ONLY
    `;

    const [rows] = await query(dataQuery, params);
    return { items: rows, total, page, limit: limitVal, totalPages: Math.ceil(total / limitVal) || 1 };
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
