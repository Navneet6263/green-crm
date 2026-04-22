const attendanceService = require("../services/attendance/attendanceService");

function resolveRequestIp(req) {
  return req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.ip || "";
}

async function getStatus(req, res) {
  const data = await attendanceService.getAttendanceStatus(req.auth, resolveRequestIp(req));
  res.json({ data });
}

async function getHistory(req, res) {
  const data = await attendanceService.listHistory(req.auth, req.query);
  res.json(data);
}

async function punch(req, res) {
  const data = await attendanceService.punch(req.auth, req.body, resolveRequestIp(req));
  res.status(201).json({ data });
}

module.exports = {
  getHistory,
  getStatus,
  punch,
};
