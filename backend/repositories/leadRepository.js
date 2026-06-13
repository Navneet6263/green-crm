const db = require("../db/connection");
const { encodeCursor } = require("../utils/pagination");
const { buildLeadUserAccessPredicate } = require("./leadAssignmentRepository");
const { OPEN_PIPELINE_STATUSES } = require("../constants/lead");

const SQL_NOW = "SYSUTCDATETIME()";

function getExecutor(executor) {
  return executor || db;
}

function parseCursorDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildCursorPage(rows, limit, getCursorPayload) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = items[items.length - 1];

  return {
    rows: items,
    total: undefined,
    pageInfo: {
      cursorBased: true,
      hasMore,
      nextCursor: hasMore && lastItem ? encodeCursor(getCursorPayload(lastItem)) : null,
    },
  };
}

function inferTotalFromPage(rows, pagination) {
  if (pagination.page === 1 && rows.length < pagination.limit) {
    return rows.length;
  }

  return null;
}

function buildWhere(filters) {
  const conditions = ["l.is_active = 1"];
  const params = [];

  if (filters.companyId) {
    conditions.push("l.company_id = ?");
    params.push(filters.companyId);
  } else if (Array.isArray(filters.companyIds)) {
    if (!filters.companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`l.company_id IN (${filters.companyIds.map(() => "?").join(", ")})`);
      params.push(...filters.companyIds);
    }
  }

  if (filters.assignedTo) {
    conditions.push("l.assigned_to = ?");
    params.push(filters.assignedTo);
  }

  if (filters.viewerUserId) {
    const viewerPredicate = buildLeadUserAccessPredicate({
      leadAlias: "l",
      primaryColumns: filters.viewerAccessColumns || ["assigned_to"],
      userId: filters.viewerUserId,
    });
    conditions.push(viewerPredicate.clause);
    params.push(...viewerPredicate.params);
  }

  if (filters.teamIds) {
    if (!filters.teamIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`l.team_id IN (${filters.teamIds.map(() => "?").join(", ")})`);
      params.push(...filters.teamIds);
    }
  }

  if (filters.createdBy) {
    conditions.push("l.created_by = ?");
    params.push(filters.createdBy);
  }

  if (filters.workflowStage) {
    conditions.push("l.workflow_stage = ?");
    params.push(filters.workflowStage);
  }

  if (filters.leadSource) {
    conditions.push("l.lead_source = ?");
    params.push(filters.leadSource);
  }

  if (filters.isWorkflow !== undefined && filters.isWorkflow !== null) {
    conditions.push("l.is_workflow = ?");
    params.push(filters.isWorkflow ? 1 : 0);
  }

  if (filters.productId) {
    conditions.push("l.product_id = ?");
    params.push(filters.productId);
  }

  if (filters.status) {
    conditions.push("l.status = ?");
    params.push(filters.status);
  }

  if (filters.quickFilter === "active") {
    conditions.push(`l.status IN (${OPEN_PIPELINE_STATUSES.map(() => "?").join(", ")})`);
    params.push(...OPEN_PIPELINE_STATUSES);
  } else if (filters.quickFilter === "working") {
    conditions.push("l.status IN (?, ?, ?, ?)");
    params.push("contacted", "qualified", "proposal", "negotiation");
  } else if (filters.quickFilter === "pending") {
    conditions.push("l.status IN (?, ?)");
    params.push("new", "pending");
  } else if (filters.quickFilter === "assigned") {
    conditions.push("l.assigned_to IS NOT NULL");
  } else if (filters.quickFilter === "unassigned") {
    conditions.push("l.assigned_to IS NULL");
  } else if (filters.quickFilter === "transferred") {
    conditions.push("l.workflow_stage IN (?, ?, ?)");
    params.push("legal", "finance", "completed");
  }

  if (filters.priority) {
    conditions.push("l.priority = ?");
    params.push(filters.priority);
  }

  if (filters.createdFrom) {
    conditions.push("l.created_at >= ?");
    params.push(filters.createdFrom);
  }

  if (filters.createdTo) {
    conditions.push("l.created_at <= ?");
    params.push(filters.createdTo);
  }

  if (filters.search) {
    conditions.push("(l.company_name LIKE ? OR l.contact_person LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)");
    params.push(
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`,
      `%${filters.search}%`
    );
  }

  if (filters.notesSearch) {
    conditions.push(`EXISTS (
      SELECT 1 FROM lead_notes ln
      WHERE ln.lead_id = l.lead_id
        AND ln.company_id = l.company_id
        AND ln.content LIKE ?
    )`);
    params.push(`%${filters.notesSearch}%`);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

async function getLeadById(leadId, companyId, executor) {
  const active = getExecutor(executor);
  const conditions = ["l.lead_id = ?"];
  const params = [leadId];

  if (companyId) {
    conditions.push("l.company_id = ?");
    params.push(companyId);
  }

  const [rows] = await active.query(
    `
      SELECT TOP 1
        l.*,
        p.name AS product_name,
        assignee.name AS assigned_to_name,
        assignee.email AS assigned_to_email,
        assignee.role AS assigned_to_role,
        assignee.department AS assigned_to_department,
        creator.name AS created_by_name,
        team.name AS team_name,
        team.code AS team_code,
        legal_user.name AS legal_owner_name,
        finance_user.name AS finance_owner_name,
        (
          SELECT COUNT(*)
          FROM lead_notes ln
          WHERE ln.lead_id = l.lead_id AND ln.company_id = l.company_id
        ) AS note_count,
        (
          SELECT TOP 1 ln.content
          FROM lead_notes ln
          WHERE ln.lead_id = l.lead_id AND ln.company_id = l.company_id
          ORDER BY ln.created_at DESC
        ) AS latest_note
      FROM leads l
      LEFT JOIN products p ON p.product_id = l.product_id
      LEFT JOIN users assignee ON assignee.user_id = l.assigned_to
      LEFT JOIN users creator ON creator.user_id = l.created_by
      LEFT JOIN teams team ON team.team_id = l.team_id
      LEFT JOIN users legal_user ON legal_user.user_id = l.assigned_to_legal
      LEFT JOIN users finance_user ON finance_user.user_id = l.assigned_to_finance
      WHERE ${conditions.join(" AND ")}
    `,
    params
  );

  return rows[0] || null;
}

async function listLeads(filters, pagination, executor) {
  const active = getExecutor(executor);
  const { whereClause, params } = buildWhere(filters);

  if (pagination.cursor) {
    const cursorDate = parseCursorDate(pagination.cursor.created_at);
    const cursorId = Number(pagination.cursor.id);
    const cursorClause =
      cursorDate && Number.isFinite(cursorId)
        ? " AND (l.created_at < ? OR (l.created_at = ? AND l.id < ?))"
        : "";
    const cursorParams = cursorClause ? [cursorDate, cursorDate, cursorId] : [];

    const [rows] = await active.query(
      `
        SELECT TOP (?)
          l.*,
          p.name AS product_name,
          assignee.name AS assigned_to_name,
          creator.name AS created_by_name,
          team.name AS team_name,
          team.code AS team_code,
          (
            SELECT COUNT(*)
            FROM lead_notes ln
            WHERE ln.lead_id = l.lead_id AND ln.company_id = l.company_id
          ) AS note_count,
          (
            SELECT TOP 1 ln.content
            FROM lead_notes ln
            WHERE ln.lead_id = l.lead_id AND ln.company_id = l.company_id
            ORDER BY ln.created_at DESC, ln.id DESC
          ) AS latest_note
        FROM leads l
        LEFT JOIN products p ON p.product_id = l.product_id
        LEFT JOIN users assignee ON assignee.user_id = l.assigned_to
        LEFT JOIN users creator ON creator.user_id = l.created_by
        LEFT JOIN teams team ON team.team_id = l.team_id
        ${whereClause}${cursorClause}
        ORDER BY l.created_at DESC, l.id DESC
      `,
      [pagination.limit + 1, ...params, ...cursorParams]
    );

    return buildCursorPage(rows, pagination.limit, (row) => ({
      created_at: row.created_at,
      id: row.id,
    }));
  }

  const [rows] = await active.query(
    `
      SELECT
        l.*,
        p.name AS product_name,
        assignee.name AS assigned_to_name,
        assignee.email AS assigned_to_email,
        assignee.role AS assigned_to_role,
        assignee.department AS assigned_to_department,
        creator.name AS created_by_name,
        team.name AS team_name,
        team.code AS team_code,
        COUNT(*) OVER() AS total_count,
        (
          SELECT COUNT(*)
          FROM lead_notes ln
          WHERE ln.lead_id = l.lead_id AND ln.company_id = l.company_id
        ) AS note_count,
        (
          SELECT TOP 1 ln.content
          FROM lead_notes ln
          WHERE ln.lead_id = l.lead_id AND ln.company_id = l.company_id
          ORDER BY ln.created_at DESC
        ) AS latest_note
      FROM leads l
      LEFT JOIN products p ON p.product_id = l.product_id
      LEFT JOIN users assignee ON assignee.user_id = l.assigned_to
      LEFT JOIN users creator ON creator.user_id = l.created_by
      LEFT JOIN teams team ON team.team_id = l.team_id
      ${whereClause}
      ORDER BY l.created_at DESC, l.id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  const totalFromWindow = rows.length ? Number(rows[0].total_count || 0) : null;
  const normalizedRows = rows.map(({ total_count, ...row }) => row);
  if (totalFromWindow !== null) {
    return {
      rows: normalizedRows,
      total: totalFromWindow,
      pageInfo: null,
    };
  }

  const inferredTotal = inferTotalFromPage(normalizedRows, pagination);
  if (inferredTotal !== null) {
    return {
      rows: normalizedRows,
      total: inferredTotal,
      pageInfo: null,
    };
  }

  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM leads l ${whereClause}`,
    params
  );

  return {
    rows: normalizedRows,
    total: countRows[0].total,
    pageInfo: null,
  };
}

async function createLead(lead, executor) {
  const active = getExecutor(executor);

  await active.query(
    `
      INSERT INTO leads (
        lead_id,
        company_id,
        contact_person,
        company_name,
        email,
        phone,
        address_street,
        address_city,
        address_state,
        address_zip,
        address_country,
        industry,
        lead_source,
        follow_up_date,
        status,
        priority,
        estimated_value,
        number_of_units,
        no_of_employees,
        team_id,
        assigned_to,
        assigned_at,
        assigned_by,
        created_by,
        product_id,
        requirements,
        workflow_stage,
        is_active,
        last_contacted_at,
        is_workflow,
        workflow_status,
        completed_files,
        quality,
        expert_notes,
        admin_comments,
        total_lead_value,
        advance_received,
        active_users,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${SQL_NOW}, ${SQL_NOW})
    `,
    [
      lead.lead_id,
      lead.company_id,
      lead.contact_person,
      lead.company_name,
      lead.email,
      lead.phone,
      lead.address_street || null,
      lead.address_city || null,
      lead.address_state || null,
      lead.address_zip || null,
      lead.address_country || null,
      lead.industry || null,
      lead.lead_source || "website",
      lead.follow_up_date || null,
      lead.status || "new",
      lead.priority || "medium",
      lead.estimated_value || 0,
      lead.number_of_units,
      lead.no_of_employees || null,
      lead.team_id || null,
      lead.assigned_to || null,
      lead.assigned_to ? new Date() : null,
      lead.assigned_by || null,
      lead.created_by,
      lead.product_id,
      lead.requirements || null,
      lead.workflow_stage || "sales",
      1,
      lead.last_contacted_at || null,
      lead.is_workflow || 0,
      lead.workflow_status || null,
      lead.completed_files || null,
      lead.quality || null,
      lead.expert_notes || null,
      lead.admin_comments || null,
      lead.estimated_value || lead.total_lead_value || 0,
      lead.advance_received || 0,
      lead.active_users || null,
    ]
  );

  return getLeadById(lead.lead_id, lead.company_id, active);
}

async function updateLead(leadId, companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  Object.entries(updates).forEach(([column, value]) => {
    fields.push(`${column} = ?`);
    params.push(value ?? null);
  });

  if (fields.length) {
    await active.query(
      `UPDATE leads SET ${fields.join(", ")}, updated_at = ${SQL_NOW} WHERE lead_id = ? AND company_id = ?`,
      [...params, leadId, companyId]
    );
  }

  return getLeadById(leadId, companyId, active);
}

async function softDeleteLead(leadId, companyId, executor) {
  const active = getExecutor(executor);
  await active.query(
    `UPDATE leads SET is_active = 0, deleted_at = ${SQL_NOW}, updated_at = ${SQL_NOW} WHERE lead_id = ? AND company_id = ?`,
    [leadId, companyId]
  );
}

async function createNote(note, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_notes (company_id, lead_id, content, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ${SQL_NOW}, ${SQL_NOW})
    `,
    [note.company_id, note.lead_id, note.content, note.created_by]
  );
}

async function listNotes(leadId, companyId, pagination, executor) {
  const active = getExecutor(executor);

  if (pagination.cursor) {
    const cursorDate = parseCursorDate(pagination.cursor.created_at);
    const cursorId = Number(pagination.cursor.id);
    const cursorClause =
      cursorDate && Number.isFinite(cursorId)
        ? " AND (ln.created_at < ? OR (ln.created_at = ? AND ln.id < ?))"
        : "";
    const cursorParams = cursorClause ? [cursorDate, cursorDate, cursorId] : [];

    const [rows] = await active.query(
      `
        SELECT TOP (?)
          ln.*,
          u.name AS created_by_name
        FROM lead_notes ln
        LEFT JOIN users u ON u.user_id = ln.created_by
        WHERE ln.lead_id = ? AND ln.company_id = ?${cursorClause}
        ORDER BY ln.created_at DESC, ln.id DESC
      `,
      [pagination.limit + 1, leadId, companyId, ...cursorParams]
    );

    return buildCursorPage(rows, pagination.limit, (row) => ({
      created_at: row.created_at,
      id: row.id,
    }));
  }

  const [countRows] = await active.query(
    "SELECT COUNT(*) AS total FROM lead_notes WHERE lead_id = ? AND company_id = ?",
    [leadId, companyId]
  );
  const [rows] = await active.query(
    `
      SELECT
        ln.*,
        u.name AS created_by_name
      FROM lead_notes ln
      LEFT JOIN users u ON u.user_id = ln.created_by
      WHERE ln.lead_id = ? AND ln.company_id = ?
      ORDER BY ln.created_at DESC, ln.id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [leadId, companyId, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
    pageInfo: null,
  };
}

async function createActivity(activity, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO lead_activities (
        activity_id,
        company_id,
        lead_id,
        type,
        description,
        created_by,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ${SQL_NOW})
    `,
    [
      activity.activity_id,
      activity.company_id,
      activity.lead_id,
      activity.type,
      activity.description || null,
      activity.created_by,
    ]
  );
}

async function listActivities(leadId, companyId, pagination, executor) {
  const active = getExecutor(executor);

  if (pagination.cursor) {
    const cursorDate = parseCursorDate(pagination.cursor.created_at);
    const cursorId = Number(pagination.cursor.id);
    const cursorClause =
      cursorDate && Number.isFinite(cursorId)
        ? " AND (la.created_at < ? OR (la.created_at = ? AND la.id < ?))"
        : "";
    const cursorParams = cursorClause ? [cursorDate, cursorDate, cursorId] : [];

    const [rows] = await active.query(
      `
        SELECT TOP (?)
          la.*,
          u.name AS created_by_name
        FROM lead_activities la
        LEFT JOIN users u ON u.user_id = la.created_by
        WHERE la.lead_id = ? AND la.company_id = ?${cursorClause}
        ORDER BY la.created_at DESC, la.id DESC
      `,
      [pagination.limit + 1, leadId, companyId, ...cursorParams]
    );

    return buildCursorPage(rows, pagination.limit, (row) => ({
      created_at: row.created_at,
      id: row.id,
    }));
  }

  const [countRows] = await active.query(
    "SELECT COUNT(*) AS total FROM lead_activities WHERE lead_id = ? AND company_id = ?",
    [leadId, companyId]
  );
  const [rows] = await active.query(
    `
      SELECT
        la.*,
        u.name AS created_by_name
      FROM lead_activities la
      LEFT JOIN users u ON u.user_id = la.created_by
      WHERE la.lead_id = ? AND la.company_id = ?
      ORDER BY la.created_at DESC, la.id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [leadId, companyId, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
    pageInfo: null,
  };
}

async function listReminders(filters, pagination, executor) {
  const active = getExecutor(executor);
  const conditions = ["l.follow_up_date IS NOT NULL", "l.is_active = 1"];
  const params = [];

  if (filters.companyId) {
    conditions.push("l.company_id = ?");
    params.push(filters.companyId);
  } else if (Array.isArray(filters.companyIds)) {
    if (!filters.companyIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`l.company_id IN (${filters.companyIds.map(() => "?").join(", ")})`);
      params.push(...filters.companyIds);
    }
  }

  if (filters.viewerUserId) {
    const viewerPredicate = buildLeadUserAccessPredicate({
      companyColumn: "l.company_id",
      leadAlias: "l",
      leadColumn: "l.lead_id",
      primaryColumns: filters.viewerAccessColumns || ["assigned_to"],
      userId: filters.viewerUserId,
    });
    conditions.push(viewerPredicate.clause);
    params.push(...viewerPredicate.params);
  } else if (filters.userId) {
    const viewerPredicate = buildLeadUserAccessPredicate({
      companyColumn: "l.company_id",
      leadAlias: "l",
      leadColumn: "l.lead_id",
      primaryColumns: filters.viewerAccessColumns || ["assigned_to"],
      userId: filters.userId,
    });
    conditions.push(viewerPredicate.clause);
    params.push(...viewerPredicate.params);
  }

  if (filters.teamIds) {
    if (!filters.teamIds.length) {
      conditions.push("1 = 0");
    } else {
      conditions.push(`l.team_id IN (${filters.teamIds.map(() => "?").join(", ")})`);
      params.push(...filters.teamIds);
    }
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  if (pagination.cursor) {
    const cursorDate = parseCursorDate(pagination.cursor.follow_up_date);
    const cursorLeadId = pagination.cursor.lead_id ? String(pagination.cursor.lead_id) : null;
    const cursorClause =
      cursorDate && cursorLeadId
        ? " AND (l.follow_up_date > ? OR (l.follow_up_date = ? AND l.lead_id > ?))"
        : "";
    const cursorParams = cursorClause ? [cursorDate, cursorDate, cursorLeadId] : [];

    const [rows] = await active.query(
      `
        SELECT TOP (?)
          l.lead_id AS reminder_id,
          l.lead_id,
          l.company_id,
          l.company_name,
          l.contact_person AS contact_person_name,
          l.follow_up_date AS due_at,
          l.assigned_to,
          l.status
        FROM leads l
        ${whereClause}${cursorClause}
        ORDER BY l.follow_up_date ASC, l.lead_id ASC
      `,
      [pagination.limit + 1, ...params, ...cursorParams]
    );

    return buildCursorPage(rows, pagination.limit, (row) => ({
      follow_up_date: row.due_at,
      lead_id: row.lead_id,
    }));
  }

  const [rows] = await active.query(
    `
      SELECT
        l.lead_id AS reminder_id,
        l.lead_id,
        l.company_id,
        l.company_name,
        l.contact_person AS contact_person_name,
        l.follow_up_date AS due_at,
        l.assigned_to,
        l.status
      FROM leads l
      ${whereClause}
      ORDER BY l.follow_up_date ASC, l.lead_id ASC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  const inferredTotal = inferTotalFromPage(rows, pagination);
  if (inferredTotal !== null) {
    return {
      rows,
      total: inferredTotal,
      pageInfo: null,
    };
  }

  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM leads l ${whereClause}`,
    params
  );

  return {
    rows,
    total: countRows[0].total,
    pageInfo: null,
  };
}

async function getProductStats({ companyId, teamIds = null, assignedTo = null, viewerUserId = null, viewerAccessColumns = ["assigned_to"] }, executor) {
  const active = getExecutor(executor);
  const normalizedTeamIds = Array.isArray(teamIds) ? teamIds.filter(Boolean) : null;
  const assignmentClause = assignedTo ? " AND l.assigned_to = ?" : "";
  const viewerPredicate = viewerUserId
    ? buildLeadUserAccessPredicate({
        leadAlias: "l",
        primaryColumns: viewerAccessColumns,
        userId: viewerUserId,
      })
    : { clause: "", params: [] };
  const viewerClause = viewerPredicate.clause ? ` AND ${viewerPredicate.clause}` : "";
  const productTeamClause = normalizedTeamIds
    ? normalizedTeamIds.length
      ? ` AND p.team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})`
      : " AND 1 = 0"
    : "";
  const leadTeamJoinClause = normalizedTeamIds
    ? normalizedTeamIds.length
      ? ` AND l.team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})`
      : " AND 1 = 0"
    : "";
  const [rows] = await active.query(
    `
      SELECT
        p.product_id,
        p.name,
        COUNT(l.lead_id) AS total_leads
      FROM products p
      LEFT JOIN leads l ON l.product_id = p.product_id AND l.is_active = 1${leadTeamJoinClause}${assignmentClause}${viewerClause}
      WHERE p.company_id = ? AND p.is_active = 1${productTeamClause}
      GROUP BY p.product_id, p.name
      ORDER BY total_leads DESC, p.name ASC
    `,
    [
      ...(normalizedTeamIds || []),
      ...(assignedTo ? [assignedTo] : []),
      ...viewerPredicate.params,
      companyId,
      ...(normalizedTeamIds || []),
    ]
  );
  return rows;
}

async function getUserProductHistory(userId, companyId, teamIds = null, executor) {
  const active = getExecutor(executor);
  const normalizedTeamIds = Array.isArray(teamIds) ? teamIds.filter(Boolean) : null;
  const teamClause = normalizedTeamIds
    ? normalizedTeamIds.length
      ? ` AND l.team_id IN (${normalizedTeamIds.map(() => "?").join(", ")})`
      : " AND 1 = 0"
    : "";
  const [rows] = await active.query(
    `
      SELECT
        p.product_id,
        p.name,
        COUNT(l.lead_id) AS lead_count,
        MAX(l.created_at) AS last_used_at
      FROM leads l
      INNER JOIN products p ON p.product_id = l.product_id
      WHERE l.company_id = ? AND l.created_by = ? AND l.is_active = 1${teamClause}
      GROUP BY p.product_id, p.name
      ORDER BY last_used_at DESC
    `,
    [companyId, userId, ...(normalizedTeamIds || [])]
  );
  return rows;
}

module.exports = {
  createActivity,
  createLead,
  createNote,
  getLeadById,
  getProductStats,
  getUserProductHistory,
  listActivities,
  listLeads,
  listNotes,
  listReminders,
  softDeleteLead,
  updateLead,
};
