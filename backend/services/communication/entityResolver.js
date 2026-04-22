const customerService = require("../customerService");
const leadService = require("../leadService");
const AppError = require("../../utils/appError");

async function loadEntity(auth, entityType, entityId) {
  if (entityType === "lead") {
    return leadService.getLead(auth, entityId);
  }

  if (entityType === "customer") {
    return customerService.getCustomer(auth, entityId);
  }

  throw new AppError("entity_type must be lead or customer.", 400);
}

module.exports = {
  loadEntity,
};
