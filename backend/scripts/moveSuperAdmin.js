// Moves the platform super admin to a new email.
//   node scripts/moveSuperAdmin.js --to you@company.com              shows what would change (nothing is saved)
//   node scripts/moveSuperAdmin.js --to you@company.com --apply      makes the change
// Options: --from super@x.com   pick the old super admin when there are several (default: the one whose email starts with super@)
//          --deactivate-old     when the new email already had an account, also switch off the old super@ login
// Passwords are never changed: set yours afterwards with "Forgot password" or Platform Users.
require("dotenv").config();
const crypto = require("node:crypto");
const sql = require("mssql");
const { config } = require("../db/connection");
const { PLATFORM_COMPANY_ID } = require("../db/schema");

// Its own connection, so the app's start-up table checks do not run against the live database.
let pool = null;
async function run(target, text, params = []) {
  let i = 0;
  const request = target.request();
  const statement = text.replace(/\?/g, () => {
    request.input(`p${i}`, params[i]);
    return `@p${i++}`;
  });
  const result = await request.query(statement);
  return [result.recordset || []];
}
const db = {
  query: async (text, params) => run(pool, text, params),
  withTransaction: async (handler) => {
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const result = await handler({ query: (text, params) => run(tx, text, params) });
      await tx.commit();
      return result;
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  },
};

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? String(args[i + 1] || "").trim().toLowerCase() : "";
};
const to = option("to");
const from = option("from");
const apply = args.includes("--apply");
const deactivateOld = args.includes("--deactivate-old");

async function main() {
  pool = await new sql.ConnectionPool(config).connect();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("Give the new email: --to you@company.com");

  const [olds] = await db.query(
    `SELECT user_id, name, email, role, company_id, is_active FROM users
     WHERE role = 'super-admin' AND ${from ? "LOWER(email) = ?" : "LOWER(email) LIKE 'super@%'"}`,
    from ? [from] : []
  );
  if (olds.length > 1) {
    console.log("More than one super admin matches. Pick one with --from:");
    olds.forEach((u) => console.log(`  ${u.email}  (${u.user_id})`));
    process.exitCode = 1;
    return;
  }
  const old = olds[0] || null;
  const [targets] = await db.query(
    "SELECT user_id, name, email, role, company_id, is_active FROM users WHERE LOWER(email) = ?",
    [to]
  );
  const target = targets[0] || null;

  console.log(`Mode: ${apply ? "APPLY (saving changes)" : "PREVIEW (nothing is saved; add --apply)"}`);
  console.log(`Old super admin: ${old ? `${old.email} (${old.user_id}, ${old.is_active ? "active" : "off"})` : "none found"}`);
  console.log(`New email: ${to} -> ${target ? `already in the database as ${target.role} of company ${target.company_id} (${target.user_id})` : "not in the database yet"}`);

  let plan;
  if (target && target.role === "super-admin") {
    plan = { kind: "nothing", text: `${to} is already a super admin. Nothing to do.` };
  } else if (target) {
    const [[work]] = await db.query(
      `SELECT (SELECT COUNT(*) FROM leads WHERE assigned_to = ? AND is_active = 1) AS leads,
              (SELECT COUNT(*) FROM tasks WHERE assigned_to = ?) AS tasks`,
      [target.user_id, target.user_id]
    ).catch(() => [[{ leads: "?", tasks: "?" }]]);
    plan = {
      kind: "upgrade",
      text: `Upgrade the existing account ${to} to super admin and move it to the platform company (${PLATFORM_COMPANY_ID}).`
        + `\n  It stops being "${target.role}" of company ${target.company_id}. It still owns ${work.leads} open leads and ${work.tasks} tasks there:`
        + "\n  give them to someone else in that company first if they should keep moving."
        + (old ? `\n  ${old.email} ${deactivateOld ? "will be switched off (--deactivate-old)" : "stays as it is (add --deactivate-old to switch it off)"}.` : ""),
    };
  } else if (old) {
    plan = { kind: "rename", text: `Change the email of ${old.email} to ${to}. Same account, same password, same history.` };
  } else {
    plan = { kind: "none", text: "No super@ super admin and no account with the new email. Use --from to name the old super admin." };
  }
  console.log(`\nPlan: ${plan.text}`);
  if (!apply || ["nothing", "none"].includes(plan.kind)) {
    if (plan.kind === "none") process.exitCode = 1;
    return;
  }

  await db.withTransaction(async (tx) => {
    if (plan.kind === "rename") {
      await tx.query("UPDATE users SET email = ?, updated_at = SYSUTCDATETIME() WHERE user_id = ?", [to, old.user_id]);
    } else {
      await tx.query(
        `UPDATE users SET role = 'super-admin', company_id = ?, is_active = 1, is_super_admin = 1, super_admin_level = 1,
           can_manage_super_admins = 1, updated_at = SYSUTCDATETIME() WHERE user_id = ?`,
        [PLATFORM_COMPANY_ID, target.user_id]
      );
      if (old && deactivateOld) await tx.query("UPDATE users SET is_active = 0, updated_at = SYSUTCDATETIME() WHERE user_id = ?", [old.user_id]);
    }
    await tx.query(
      "INSERT INTO audit_logs (audit_id, company_id, action, performed_by, target_user, details) VALUES (?, ?, ?, ?, ?, ?)",
      [`aud_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, PLATFORM_COMPANY_ID, "super_admin.moved", null, (target || old).user_id,
        JSON.stringify({ kind: plan.kind, from: old?.email || null, to, deactivated_old: Boolean(old && deactivateOld && plan.kind === "upgrade") })]
    );
  });
  console.log("\nDone. Set the password with \"Forgot password\" on the login page, then sign in with the new email.");
}

main()
  .catch((error) => {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.close().catch(() => {});
    setTimeout(() => process.exit(), 200);
  });
