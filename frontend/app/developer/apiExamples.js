// Endpoint list and code samples for the API guide. `root` is the /v1 address.

export const ENDPOINTS = [
  { method: "GET", path: "/me", scope: null, text: "Check the key: company, key name, permissions." },
  { method: "GET", path: "/leads", scope: "leads:read", text: "List leads, up to 100 per call. Filters: status, source, priority, product_id, owner_id, search, created_from, created_to, updated_since. sort: newest (default), oldest, updated. Page with page, or with cursor (meta.next_cursor). fields= returns only the fields you name." },
  { method: "GET", path: "/leads/{id}", scope: "leads:read", text: "One lead. Also takes fields=." },
  { method: "POST", path: "/leads", scope: "leads:write", text: "Create a lead. Needs contact_person (or name) and a phone or email. Returns 201 with the lead." },
  { method: "PATCH", path: "/leads/{id}", scope: "leads:write", text: "Change any writable field, for example status or owner_id. Add change_note to say why; it shows in the lead's history." },
  { method: "POST", path: "/leads/{id}/notes", scope: "leads:write", text: "Add a note: { \"content\": \"Called, wants a demo\" }." },
  { method: "GET", path: "/products", scope: "leads:read", text: "Active products, for product_id." },
  { method: "GET", path: "/users", scope: "leads:read", text: "Active people, for owner_id." },
  { method: "POST", path: "/capture/{link}", scope: "no key", text: "Lead capture link. Takes any form fields; made on the Lead capture tab." },
  { method: "GET", path: "/openapi.json", scope: "no key", text: "This API as an OpenAPI 3.1 file, for Postman, Swagger or code generators." },
];

export const FIELDS = [
  ["contact_person", "text", "Person's name (or send name)"],
  ["company_name", "text", "Company; the person's name is used when empty"],
  ["phone", "text", "Mobile number"],
  ["email", "text", "Email"],
  ["city / state / country", "text", "Address"],
  ["source", "text", "website, facebook, google, referral… (default api)"],
  ["status", "text", "new, contacted, qualified, proposal, negotiation, booked-demo, demo-done, closed-won, closed-lost…"],
  ["priority", "text", "low, medium, high"],
  ["product_id", "text", "From GET /products; optional when you have one product"],
  ["owner_id", "text", "From GET /users; you when empty"],
  ["estimated_value", "number", "Deal value"],
  ["follow_up_date", "date", "YYYY-MM-DD or a full ISO date"],
  ["requirements", "text", "What they need (or send notes)"],
];

export const ERRORS = [
  ["400", "Something in the request is wrong. The error text says what."],
  ["401", "Key missing, wrong, revoked or expired, or its admin is no longer active."],
  ["403", "The key lacks the permission, or the Developer API is switched off."],
  ["404", "No such lead or route."],
  ["409", "The first request with this Idempotency-Key is still running."],
  ["422", "Checks failed: details.problems lists each field and what is wrong. Or an Idempotency-Key was reused for a different request."],
  ["429", "Too many requests. Wait the seconds in the Retry-After header."],
  ["5xx", "Our side. Safe to retry with the same Idempotency-Key."],
];

export const SMART = [
  ["Never create twice", "Send an Idempotency-Key header (any unique text, like your order id) on POST and PATCH. If your app retries after a timeout, it gets the first answer back and nothing is saved twice. Kept 24 hours."],
  ["Test mode", "Add the header X-Dry-Run: true. GreenCRM checks everything a real save would, lists every problem at once in details.problems, and saves nothing."],
  ["Sync only what changed", "Call GET /leads?updated_since=<last sync time>&sort=updated. Save the time you started, and use it next time."],
  ["Fast paging", "Use meta.next_cursor as ?cursor= for the next page. It stays correct even while new leads keep coming in."],
  ["Small answers", "fields=id,phone,status returns only those fields. Good for mobile apps and big lists."],
  ["Limits", "Up to 100 leads per call, 120 calls per minute per key, and a daily limit per company. Every answer carries X-RateLimit-Limit, X-RateLimit-Remaining and X-RateLimit-Reset."],
  ["Support", "Every answer has an X-Request-Id header, and errors include request_id. Send it to GreenCRM support to find the exact call."],
];

export function syncSample(root) {
  return [
    "// Keep your system in sync: only leads changed since last time, 100 per call",
    `const API = "${root}";`,
    "const headers = { Authorization: `Bearer ${process.env.GREENCRM_API_KEY}` };",
    "const since = await loadLastSync();          // e.g. \"2026-11-05T00:00:00Z\"",
    "const started = new Date().toISOString();",
    "",
    "let page = 1;",
    "for (;;) {",
    "  const url = `${API}/leads?updated_since=${since}&sort=updated&page_size=100&page=${page}&fields=id,status,owner_id,phone`;",
    "  const res = await fetch(url, { headers });",
    "  if (res.status === 429) { await sleep(Number(res.headers.get(\"Retry-After\")) * 1000); continue; }",
    "  const { data, meta } = await res.json();",
    "  await saveLeads(data);",
    "  if (!meta.has_more) break;",
    "  page = meta.next_page;",
    "}",
    "await saveLastSync(started);",
    "",
    "// Create safely: a retry with the same key never makes a second lead",
    "await fetch(`${API}/leads`, {",
    "  method: \"POST\",",
    "  headers: { ...headers, \"Content-Type\": \"application/json\", \"Idempotency-Key\": \"order-48213\" },",
    "  body: JSON.stringify({ name: \"Ravi Kumar\", phone: \"9810012345\" }),",
    "});",
  ].join("\n");
}

const body = `{
    "contact_person": "Ravi Kumar",
    "company_name": "Ravi Traders",
    "phone": "9810012345",
    "email": "ravi@example.com",
    "source": "website",
    "requirements": "Needs 20 seats"
  }`;

export function samples(root) {
  return [
    ["cURL", `# List the 25 newest leads
curl "${root}/leads?page_size=25" \\
  -H "Authorization: Bearer gcrm_YOUR_KEY"

# Create a lead
curl -X POST "${root}/leads" \\
  -H "Authorization: Bearer gcrm_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/\n\s*/g, " ")}'

# Move it to "contacted"
curl -X PATCH "${root}/leads/LEAD_ID" \\
  -H "Authorization: Bearer gcrm_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"contacted"}'`],
    ["JavaScript", `const API = "${root}";
const headers = {
  Authorization: \`Bearer \${process.env.GREENCRM_API_KEY}\`,
  "Content-Type": "application/json",
};

// Create a lead
const res = await fetch(\`\${API}/leads\`, {
  method: "POST",
  headers,
  body: JSON.stringify(${body.replace(/\n {2}/g, "\n")}),
});
const { data: lead, error } = await res.json();
if (!res.ok) throw new Error(error);

// Read new leads page by page
let page = 1, more = true;
while (more) {
  const r = await fetch(\`\${API}/leads?status=new&page=\${page}&page_size=100\`, { headers });
  const { data, meta } = await r.json();
  data.forEach((l) => console.log(l.id, l.contact_person, l.phone));
  more = meta.has_more;
  page += 1;
}`],
    ["PHP", `<?php
$api = "${root}";
$key = getenv("GREENCRM_API_KEY");

$ch = curl_init("$api/leads");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ["Authorization: Bearer $key", "Content-Type: application/json"],
  CURLOPT_POSTFIELDS => json_encode([
    "contact_person" => "Ravi Kumar",
    "phone" => "9810012345",
    "requirements" => "Needs 20 seats",
  ]),
]);
$result = json_decode(curl_exec($ch), true);
echo $result["data"]["id"] ?? $result["error"];`],
    ["Python", `import os, requests

API = "${root}"
headers = {"Authorization": f"Bearer {os.environ['GREENCRM_API_KEY']}"}

lead = requests.post(f"{API}/leads", headers=headers, json={
    "contact_person": "Ravi Kumar",
    "phone": "9810012345",
    "requirements": "Needs 20 seats",
}).json()["data"]

requests.post(f"{API}/leads/{lead['id']}/notes", headers=headers, json={"content": "Sent brochure"})

leads = requests.get(f"{API}/leads", headers=headers, params={"status": "new", "page_size": 100}).json()
for l in leads["data"]:
    print(l["id"], l["contact_person"], l["phone"])`],
  ];
}

export const RESPONSE = `{
  "success": true,
  "data": {
    "id": "LED0001234",
    "contact_person": "Ravi Kumar",
    "company_name": "Ravi Traders",
    "phone": "9810012345",
    "email": "ravi@example.com",
    "source": "website",
    "status": "new",
    "priority": "medium",
    "product_id": "PRD0001",
    "product_name": "GreenCRM",
    "owner_id": "USR0001",
    "owner_name": "Navneet Kumar",
    "created_at": "2026-11-06T05:30:00.000Z"
  },
  "meta": null
}`;
