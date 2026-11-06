// Ready-to-paste code and steps for each place a lead link can be used.

export function htmlForm(url) {
  return `<!-- GreenCRM lead form: paste where the form should appear -->
<form action="${url}" method="POST">
  <input name="name" placeholder="Your name" required>
  <input name="phone" type="tel" placeholder="Mobile number" required>
  <input name="email" type="email" placeholder="Email">
  <input name="company" placeholder="Company">
  <input name="city" placeholder="City">
  <textarea name="message" placeholder="How can we help?"></textarea>

  <!-- Spam trap: keep it hidden, people never fill it -->
  <input name="_gotcha" style="display:none" tabindex="-1" autocomplete="off">

  <button type="submit">Send</button>
</form>`;
}

export function fetchCode(url) {
  return `// Send a lead from your own website code (no page reload)
await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Ravi Kumar",
    phone: "9810012345",
    email: "ravi@example.com",
    company: "Ravi Traders",
    message: "Need a demo",
    utm_source: "google"      // any extra field is saved on the lead too
  })
});`;
}

export function curlCode(url) {
  return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Ravi Kumar","phone":"9810012345","email":"ravi@example.com","message":"Need a demo"}'`;
}

export function phpCode(url) {
  return `<?php
// For WordPress / PHP sites: run this after your form is submitted
$response = wp_remote_post("${url}", [
  "headers" => ["Content-Type" => "application/json"],
  "body" => wp_json_encode([
    "name" => $_POST["your-name"] ?? "",
    "phone" => $_POST["your-phone"] ?? "",
    "email" => $_POST["your-email"] ?? "",
    "message" => $_POST["your-message"] ?? "",
  ]),
]);`;
}

/** Step-by-step guides; `url` is the lead link. */
export const GUIDES = [
  {
    key: "website",
    label: "Website form",
    intro: "Copy the form below into your website page. Every form sent becomes a lead. Field names like name, phone, email, company, city and message are picked up automatically, and anything else is saved in the lead's notes.",
    code: [["HTML form", htmlForm], ["JavaScript", fetchCode], ["WordPress / PHP", phpCode]],
  },
  {
    key: "facebook",
    label: "Facebook / Instagram ads",
    intro: "Facebook Lead Ads reach GreenCRM through a connector app such as Zapier, Pabbly Connect or Make.",
    steps: [
      "Open Zapier (or Pabbly Connect / Make) and create a new automation.",
      "Trigger: Facebook Lead Ads → New Lead. Connect your Facebook page and pick the lead form.",
      "Action: Webhooks → POST. Paste the lead link below as the URL, and choose JSON.",
      "Map the fields: name → Full name, phone → Phone number, email → Email. Add any other question you want.",
      "Turn it on, then use Facebook's Lead Ads Testing Tool to send a test lead. It shows up in Activity here.",
    ],
  },
  {
    key: "google",
    label: "Google Ads lead form",
    intro: "Google Ads can send leads straight to this link, with no other app in between.",
    steps: [
      "In Google Ads, open the campaign's lead form asset.",
      "Under lead delivery, choose Webhook integration.",
      "Paste the lead link below as the Webhook URL. For the Key, type any word (for example greencrm).",
      "Click Send test data. A test lead appears in Activity here.",
      "Save the form. New leads now arrive within a minute.",
    ],
  },
  {
    key: "indiamart",
    label: "IndiaMART / Justdial",
    intro: "Lead portals that can push enquiries to a web address can use this link as it is. GreenCRM reads IndiaMART's push format (SENDER_NAME, SENDER_MOBILE, QUERY_MESSAGE…) automatically.",
    steps: [
      "In the IndiaMART seller panel, open the Lead Manager settings for CRM integration (Push API). If you cannot find it, ask your IndiaMART account manager to enable lead push to a URL.",
      "Give them the lead link below as the push URL.",
      "Ask them to send one test enquiry and check that it appears in Activity here.",
      "For Justdial and other portals, use the same link if they offer a webhook, or connect them through Zapier / Pabbly.",
    ],
  },
  {
    key: "zapier",
    label: "Zapier / Pabbly / Make",
    intro: "Any app these tools connect to (Google Sheets, Typeform, Wix, Shopify, Calendly and many more) can send leads here.",
    steps: [
      "Create an automation with the app you want as the trigger, for example Google Sheets → New row.",
      "Add the action Webhooks → POST (in Pabbly: API by Pabbly; in Make: HTTP → Make a request).",
      "Paste the lead link below as the URL, choose JSON, and add the fields name, phone, email, company, city, message.",
      "Run a test. The test lead shows up in Activity here.",
    ],
    code: [["Test from a terminal", curlCode]],
  },
];
