// Live updates for Discuss over Server-Sent Events. One entry per open browser tab.
const clients = new Set();

function connect(req, res) {
  res.writeHead(200, { "Content-Type": "text/event-stream", Connection: "keep-alive", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
  res.write("retry: 5000\n\n");
  const client = { userId: Number(req.auth.id), companyId: req.auth.companyId, res };
  clients.add(client);
  // Keeps proxies (nginx, load balancers) from closing a quiet connection.
  const heartbeat = setInterval(() => { try { res.write(": ping\n\n"); } catch (_e) { /* closed */ } }, 25000);
  req.on("close", () => { clearInterval(heartbeat); clients.delete(client); });
}

/** Sends an event to the listed people (numeric user ids), or to everyone in the company when `companyWide`. */
function publish(event, { companyId, userIds = [], companyWide = false }) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const targets = new Set(userIds.map(Number));
  for (const client of clients) {
    if (client.companyId !== companyId) continue;
    if (!companyWide && !targets.has(client.userId)) continue;
    try { client.res.write(payload); } catch (_e) { clients.delete(client); }
  }
}

const onlineUserIds = (companyId) => [...new Set([...clients].filter((c) => c.companyId === companyId).map((c) => c.userId))];

module.exports = { connect, onlineUserIds, publish };
