const db = require("../db/connection");

function getExecutor(executor) {
  return executor || db;
}

function buildWhere(filters) {
  const conditions = ["t.company_id = ?"];
  const params = [filters.companyId];

  if (filters.assignedTo) {
    conditions.push("t.assigned_to = ?");
    params.push(filters.assignedTo);
  }

  if (filters.status) {
    conditions.push("t.status = ?");
    params.push(filters.status);
  }

  if (filters.priority) {
    conditions.push("t.priority = ?");
    params.push(filters.priority);
  }

  if (filters.search) {
    conditions.push("(t.title LIKE ? OR t.type LIKE ? OR t.notes LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  return {
    whereClause: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

async function listTasks(filters, pagination, executor) {
  const active = getExecutor(executor);
  const { whereClause, params } = buildWhere(filters);
  const [countRows] = await active.query(
    `SELECT COUNT(*) AS total FROM tasks t ${whereClause}`,
    params
  );
  const [rows] = await active.query(
    `
      SELECT
        t.*,
        u.name AS assigned_to_name,
        creator.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.user_id = t.assigned_to
      LEFT JOIN users creator ON creator.user_id = t.created_by
      ${whereClause}
      ORDER BY t.due_date ASC, t.created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `,
    [...params, pagination.offset, pagination.limit]
  );

  return {
    rows,
    total: countRows[0].total,
  };
}

async function getTaskById(taskId, companyId, executor) {
  const active = getExecutor(executor);
  const [rows] = await active.query(
    `
      SELECT TOP 1
        t.*,
        u.name AS assigned_to_name,
        creator.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.user_id = t.assigned_to
      LEFT JOIN users creator ON creator.user_id = t.created_by
      WHERE t.task_id = ? AND t.company_id = ?
    `,
    [taskId, companyId]
  );
  return rows[0] || null;
}

async function createTask(task, executor) {
  const active = getExecutor(executor);
  await active.query(
    `
      INSERT INTO tasks
        (task_id, company_id, title, type, status, priority, due_date, assigned_to, related_to, related_id, created_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      task.task_id,
      task.company_id,
      task.title,
      task.type || "call",
      task.status || "pending",
      task.priority || "medium",
      task.due_date,
      task.assigned_to || null,
      task.related_to || null,
      task.related_id || null,
      task.created_by,
      task.notes || null,
    ]
  );

  return getTaskById(task.task_id, task.company_id, active);
}

async function updateTask(taskId, companyId, updates, executor) {
  const active = getExecutor(executor);
  const fields = [];
  const params = [];

  ["title", "type", "status", "priority", "due_date", "assigned_to", "related_to", "related_id", "notes"].forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(updates, column)) {
      return;
    }
    fields.push(`${column} = ?`);
    params.push(updates[column]);
  });

  if (fields.length) {
    await active.query(
      `UPDATE tasks SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE task_id = ? AND company_id = ?`,
      [...params, taskId, companyId]
    );
  }

  return getTaskById(taskId, companyId, active);
}

async function deleteTask(taskId, companyId, executor) {
  const active = getExecutor(executor);
  await active.query("DELETE FROM tasks WHERE task_id = ? AND company_id = ?", [taskId, companyId]);
}

module.exports = {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
};
