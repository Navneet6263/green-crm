const dashboardService = require("../services/dashboardService");

async function summary(req, res) {
  const data = await dashboardService.getSummary(req.auth, req.query);
  res.json({ data });
}

module.exports = {
  summary,
};
