const { query } = require('../db/connection');

class CustomerNoteRepository {
  /**
   * Get all notes for a customer
   */
  async findByCustomer(customerId) {
    const queryText = `
      SELECT
        cn.id,
        cn.company_id,
        cn.customer_id,
        cn.content,
        cn.created_by,
        cn.created_at,
        cn.updated_at,
        u.name as created_by_name,
        u.role as created_by_role
      FROM customer_notes cn
      LEFT JOIN users u ON cn.created_by = u.user_id
      WHERE cn.customer_id = ?
      ORDER BY cn.created_at DESC
    `;

    const [rows] = await query(queryText, [customerId]);
    return rows;
  }

  /**
   * Get all notes for a company
   */
  async findByCompany(companyId) {
    const queryText = `
      SELECT
        cn.id,
        cn.company_id,
        cn.customer_id,
        cn.content,
        cn.created_by,
        cn.created_at,
        cn.updated_at,
        u.name as created_by_name,
        u.role as created_by_role
      FROM customer_notes cn
      LEFT JOIN users u ON cn.created_by = u.user_id
      WHERE cn.company_id = ?
      ORDER BY cn.created_at DESC
    `;

    const [rows] = await query(queryText, [companyId]);
    return rows;
  }

  /**
   * Create a new customer note
   */
  async create(noteData) {
    const insertQuery = `
      INSERT INTO customer_notes (company_id, customer_id, content, created_by)
      OUTPUT INSERTED.id
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      noteData.companyId,
      noteData.customerId,
      noteData.content,
      noteData.createdBy
    ];

    const [insertResult] = await query(insertQuery, params);
    
    if (!Array.isArray(insertResult) || insertResult.length === 0) {
      throw new Error('Failed to create customer note - no ID returned');
    }
    
    const noteId = insertResult[0].id;
    
    // Fetch the complete note with user details
    const selectQuery = `
      SELECT
        cn.id,
        cn.company_id,
        cn.customer_id,
        cn.content,
        cn.created_by,
        cn.created_at,
        cn.updated_at,
        u.name as created_by_name,
        u.role as created_by_role
      FROM customer_notes cn
      LEFT JOIN users u ON cn.created_by = u.user_id
      WHERE cn.id = ?
    `;
    const [selectResult] = await query(selectQuery, [noteId]);
    
    if (!Array.isArray(selectResult) || selectResult.length === 0) {
      throw new Error('Failed to fetch created customer note');
    }
    
    return selectResult[0];
  }

  /**
   * Delete a customer note
   */
  async delete(noteId, companyId) {
    const queryText = `
      DELETE FROM customer_notes
      WHERE id = ? AND company_id = ?
    `;

    const [result] = await query(queryText, [noteId, companyId]);
    return result.affectedRows > 0;
  }

  /**
   * Get recent notes across all customers for a company
   * @param {string} companyId 
   * @param {number} limit 
   */
  async getRecentByCompany(companyId, limit = 20) {
    const queryText = `
      SELECT TOP ${limit}
        cn.id,
        cn.company_id,
        cn.customer_id,
        cn.content,
        cn.created_by,
        cn.created_at,
        cn.updated_at,
        u.name as created_by_name,
        u.role as created_by_role,
        c.name as customer_name,
        c.company_name as customer_company_name
      FROM customer_notes cn
      LEFT JOIN users u ON cn.created_by = u.user_id
      LEFT JOIN customers c ON cn.customer_id = c.customer_id
      WHERE cn.company_id = ?
      ORDER BY cn.created_at DESC
    `;

    const [rows] = await query(queryText, [companyId]);
    return rows;
  }
}

module.exports = new CustomerNoteRepository();
