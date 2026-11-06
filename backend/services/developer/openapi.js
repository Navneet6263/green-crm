const { EVENTS } = require("./webhooks");
const { FIELDS, MAX_PAGE } = require("./publicLeads");

// OpenAPI 3.1 description of /api/v1, served at /api/v1/openapi.json for Postman, Swagger and code generators.

const str = (description, extra = {}) => ({ type: "string", description, ...extra });
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const errors = {
  400: { $ref: "#/components/responses/Error" }, 401: { $ref: "#/components/responses/Error" },
  403: { $ref: "#/components/responses/Error" }, 404: { $ref: "#/components/responses/Error" },
  422: { $ref: "#/components/responses/Error" }, 429: { $ref: "#/components/responses/Error" },
};
const ok = (schema, description = "OK") => ({ description, content: { "application/json": { schema: { type: "object", properties: { success: { const: true }, data: schema, meta: { type: ["object", "null"] } } } } } });
const writeHeaders = [
  { name: "Idempotency-Key", in: "header", schema: { type: "string", minLength: 8, maxLength: 100 }, description: "Send the same key when you retry; you get the first answer back and nothing is saved twice. Kept 24 hours." },
  { name: "X-Dry-Run", in: "header", schema: { type: "string", enum: ["true"] }, description: "Test mode: checks the request and lists every problem, but saves nothing." },
];
const leadId = { name: "id", in: "path", required: true, schema: { type: "string" } };
const fieldsParam = { name: "fields", in: "query", schema: { type: "string" }, description: `Comma list of fields to return. Allowed: ${FIELDS.join(", ")}` };

function buildSpec(serverUrl) {
  const leadProps = Object.fromEntries(FIELDS.map((f) => [f, { type: ["string", "number", "null"] }]));
  const writable = {
    contact_person: str("Person's name (or send name)"), company_name: str("Company"), phone: str("Mobile number"), email: str("Email", { format: "email" }),
    city: str("City"), state: str("State"), country: str("Country"), industry: str("Industry"), source: str("Lead source, default api"),
    status: str("Lead status"), priority: str("low, medium or high"), product_id: str("From GET /products"), owner_id: str("From GET /users"),
    estimated_value: { type: "number" }, follow_up_date: str("YYYY-MM-DD or ISO date"), requirements: str("What they need"),
  };
  return {
    openapi: "3.1.0",
    info: { title: "GreenCRM API", version: "1.0.0", description: "Read and create leads, and get webhooks when they change. Every answer is { success, data, meta } or { success: false, error, code, details, request_id }." },
    servers: [{ url: serverUrl }],
    security: [{ bearer: [] }],
    paths: {
      "/me": { get: { summary: "Check your key", responses: { 200: ok({ type: "object" }), ...errors } } },
      "/leads": {
        get: {
          summary: `List leads (up to ${MAX_PAGE} per call)`,
          parameters: [
            ...["status", "source", "priority", "product_id", "owner_id", "search"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
            { name: "updated_since", in: "query", schema: { type: "string", format: "date-time" }, description: "Only leads changed since then; use with sort=updated for syncing." },
            { name: "created_from", in: "query", schema: { type: "string" } }, { name: "created_to", in: "query", schema: { type: "string" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "oldest", "updated"], default: "newest" } },
            { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
            { name: "cursor", in: "query", schema: { type: "string" }, description: "meta.next_cursor from the last page (sort=newest)." },
            { name: "page_size", in: "query", schema: { type: "integer", minimum: 1, maximum: MAX_PAGE, default: 25 } },
            fieldsParam,
          ],
          responses: { 200: ok({ type: "array", items: ref("Lead") }), ...errors },
        },
        post: { summary: "Create a lead", parameters: writeHeaders, requestBody: { required: true, content: { "application/json": { schema: ref("LeadInput") } } }, responses: { 201: ok(ref("Lead"), "Created"), ...errors } },
      },
      "/leads/{id}": {
        get: { summary: "One lead", parameters: [leadId, fieldsParam], responses: { 200: ok(ref("Lead")), ...errors } },
        patch: {
          summary: "Change a lead", parameters: [leadId, ...writeHeaders],
          requestBody: { required: true, content: { "application/json": { schema: { allOf: [ref("LeadInput"), { type: "object", properties: { change_note: str("Why it changed; shown in the lead's history") } }] } } } },
          responses: { 200: ok(ref("Lead")), ...errors },
        },
      },
      "/leads/{id}/notes": { post: { summary: "Add a note", parameters: [leadId, ...writeHeaders], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["content"], properties: { content: { type: "string" } } } } } }, responses: { 201: ok({ type: "object" }), ...errors } } },
      "/products": { get: { summary: "Active products", responses: { 200: ok({ type: "array", items: { type: "object" } }), ...errors } } },
      "/users": { get: { summary: "Active people", responses: { 200: ok({ type: "array", items: { type: "object" } }), ...errors } } },
      "/capture/{link}": { post: { summary: "Lead capture link (no key; any form fields)", security: [], parameters: [{ name: "link", in: "path", required: true, schema: { type: "string" } }], responses: { 201: ok({ type: "object" }, "Lead created"), 200: ok({ type: "object" }, "Already in the CRM, note added"), ...errors } } },
    },
    webhooks: Object.fromEntries(Object.entries(EVENTS).map(([event, description]) => [event, {
      post: {
        summary: description,
        parameters: [
          { name: "X-GreenCRM-Event", in: "header", schema: { type: "string" } },
          { name: "X-GreenCRM-Signature", in: "header", schema: { type: "string" }, description: "t=<unix time>,v1=<hex HMAC-SHA256 of \"t.body\" with your webhook secret>" },
        ],
        requestBody: { content: { "application/json": { schema: ref("Event") } } },
        responses: { 200: { description: "Answer with any 2xx within 10 seconds" } },
      },
    }])),
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", description: "Your API key, gcrm_..." } },
      schemas: {
        Lead: { type: "object", properties: leadProps },
        LeadInput: { type: "object", properties: writable, additionalProperties: false },
        Event: { type: "object", properties: { id: { type: "string" }, type: { type: "string" }, created_at: { type: "string", format: "date-time" }, company_id: { type: "string" }, data: { type: "object" } } },
        Error: { type: "object", properties: { success: { const: false }, error: { type: "string" }, code: { type: ["string", "null"] }, details: {}, request_id: { type: "string" } } },
      },
      responses: { Error: { description: "Error", content: { "application/json": { schema: ref("Error") } } } },
    },
  };
}

module.exports = { buildSpec };
