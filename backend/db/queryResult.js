function classifyStatement(sqlText) {
  return {
    isInsert: /^\s*INSERT\b/i.test(sqlText),
    isSelect: /^\s*SELECT\b/i.test(sqlText),
    isWith: /^\s*;?\s*WITH\b/i.test(sqlText),
    hasOutput: /\bOUTPUT\s+(?:INSERTED|DELETED)\./i.test(sqlText),
  };
}

function formatResult(result, meta) {
  if (meta.isSelect || meta.hasOutput || (meta.isWith && Array.isArray(result.recordset))) {
    return [result.recordset || [], result];
  }
  const affectedRows = (result.rowsAffected || []).reduce((sum, count) => sum + count, 0);
  if (meta.isInsert) {
    const identity = result.recordsets?.[result.recordsets.length - 1]?.[0];
    return [{ affectedRows, insertId: identity?.insertId ?? null }, result];
  }
  return [{ affectedRows }, result];
}

module.exports = { classifyStatement, formatResult };
