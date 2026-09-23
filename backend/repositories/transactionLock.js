const AppError = require('../utils/appError');

async function acquireTransactionLock(tx, resource) {
  // connection.query returns affected-row metadata for a DECLARE/EXEC batch.
  // Its second result is the raw mssql result containing our SELECT recordset.
  const [, result] = await tx.query("DECLARE @r INT; EXEC @r=sp_getapplock @Resource=?, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; SELECT @r AS result;", [resource]);
  const code = result?.recordset?.[0]?.result;
  if (!Number.isInteger(code) || code < 0) throw new AppError('Upload busy. Retry later.', 503);
}

module.exports = acquireTransactionLock;
