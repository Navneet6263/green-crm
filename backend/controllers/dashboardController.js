const dashboardService = require("../services/dashboardService");

async function summary(req, res) {
  const data = await dashboardService.getSummary(req.auth, req.query);
  res.json({ data });
}

/**
 * Widget-level endpoints for lazy/parallel dashboard loading.
 * Each widget loads independently so the page renders progressively.
 */
async function widgetKpis(req, res) {
  const data = await dashboardService.getWidgetKpis(req.auth, req.query);
  res.json({ data });
}

async function widgetLeads(req, res) {
  const data = await dashboardService.getWidgetRecentLeads(req.auth, req.query);
  res.json({ data });
}

async function widgetTasks(req, res) {
  const data = await dashboardService.getWidgetTasks(req.auth, req.query);
  res.json({ data });
}

async function widgetCharts(req, res) {
  const data = await dashboardService.getWidgetCharts(req.auth, req.query);
  res.json({ data });
}

module.exports = {
  summary,
  widgetCharts,
  widgetKpis,
  widgetLeads,
  widgetTasks,
};
