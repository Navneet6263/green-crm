function capabilitiesKey(companyId) {
  return `communications:capabilities:${companyId}`;
}

function integrationSnapshotKey(companyId) {
  return `communications:config:${companyId}`;
}

module.exports = {
  capabilitiesKey,
  integrationSnapshotKey,
};
