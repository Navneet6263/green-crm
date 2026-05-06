/**
 * Workflow Stage State Machine
 * Enforces valid transitions: sales → legal → finance → completed
 * Direct jumps (e.g. sales → finance) are blocked.
 */

const VALID_TRANSITIONS = {
  sales: ["legal"],
  legal: ["finance", "sales"], // can revert to sales
  finance: ["completed", "legal"], // can revert to legal
  completed: [], // terminal state
};

const STAGE_LABELS = {
  sales: "Sales",
  legal: "Legal",
  finance: "Finance",
  completed: "Completed",
};

/**
 * Returns true if the transition from `from` to `to` is allowed.
 */
function isValidTransition(from, to) {
  if (!from || !to) return false;
  if (from === to) return false;
  const allowed = VALID_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Throws AppError if the transition is not allowed.
 * @param {string} from - current workflow_stage
 * @param {string} to   - requested workflow_stage
 */
function assertValidTransition(from, to) {
  const AppError = require("./appError");

  if (!VALID_TRANSITIONS[from]) {
    throw new AppError(`Unknown workflow stage: "${from}".`, 400);
  }

  if (!VALID_TRANSITIONS[to] && to !== "completed") {
    throw new AppError(`Unknown target workflow stage: "${to}".`, 400);
  }

  if (!isValidTransition(from, to)) {
    const allowed = VALID_TRANSITIONS[from];
    const allowedLabel = allowed.length
      ? allowed.map((s) => STAGE_LABELS[s] || s).join(" or ")
      : "none (terminal stage)";
    throw new AppError(
      `Cannot move lead from "${STAGE_LABELS[from] || from}" to "${STAGE_LABELS[to] || to}". ` +
        `Allowed next stage(s): ${allowedLabel}.`,
      400
    );
  }
}

module.exports = { assertValidTransition, isValidTransition, VALID_TRANSITIONS, STAGE_LABELS };
