// How the receiving app checks that a webhook call really came from GreenCRM.

export const SAMPLE_EVENT = `{
  "id": "evt_8f2c41d9a0b7e3c5f611",
  "type": "lead.status_changed",
  "created_at": "2026-11-06T06:15:00.000Z",
  "company_id": "CMP0001",
  "data": {
    "lead": { "id": "LED0001234", "contact_person": "Ravi Kumar", "phone": "9810012345", "status": "contacted", "owner_id": "USR0002" },
    "from": "new",
    "to": "contacted",
    "actor": { "id": "USR0002", "name": "Priya Verma", "via": "crm" }
  }
}`;

export const VERIFY = [
  ["Node.js", `import crypto from "node:crypto";
import express from "express";

const app = express();
const SECRET = process.env.GREENCRM_WEBHOOK_SECRET; // whsec_...

// Read the raw body: the signature is made from the exact bytes we sent.
app.post("/greencrm", express.raw({ type: "application/json" }), (req, res) => {
  const header = req.get("X-GreenCRM-Signature") || "";
  const { t, v1 } = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const expected = crypto.createHmac("sha256", SECRET).update(\`\${t}.\${req.body}\`).digest("hex");
  const fresh = Math.abs(Date.now() / 1000 - Number(t)) < 300; // within 5 minutes
  const same = v1 && v1.length === expected.length && crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  if (!fresh || !same) return res.status(400).send("Bad signature");

  const event = JSON.parse(req.body);
  // The same event can arrive twice (retries): skip ids you already handled.
  console.log(event.type, event.data.lead?.id);
  res.sendStatus(200); // answer within 10 seconds, do slow work later
});`],
  ["PHP", `<?php
$secret = getenv("GREENCRM_WEBHOOK_SECRET");
$body = file_get_contents("php://input");
parse_str(str_replace(",", "&", $_SERVER["HTTP_X_GREENCRM_SIGNATURE"] ?? ""), $sig);

$expected = hash_hmac("sha256", $sig["t"] . "." . $body, $secret);
if (abs(time() - (int)$sig["t"]) > 300 || !hash_equals($expected, $sig["v1"] ?? "")) {
  http_response_code(400);
  exit("Bad signature");
}

$event = json_decode($body, true);
error_log($event["type"] . " " . ($event["data"]["lead"]["id"] ?? ""));
http_response_code(200);`],
  ["Python", `import hashlib, hmac, json, os, time
from flask import Flask, request, abort

app = Flask(__name__)
SECRET = os.environ["GREENCRM_WEBHOOK_SECRET"].encode()

@app.post("/greencrm")
def greencrm():
    parts = dict(p.split("=", 1) for p in request.headers.get("X-GreenCRM-Signature", "").split(","))
    body = request.get_data()
    expected = hmac.new(SECRET, f"{parts.get('t')}.".encode() + body, hashlib.sha256).hexdigest()
    if abs(time.time() - int(parts.get("t", 0))) > 300 or not hmac.compare_digest(expected, parts.get("v1", "")):
        abort(400)
    event = json.loads(body)
    print(event["type"], event["data"].get("lead", {}).get("id"))
    return "", 200`],
];
