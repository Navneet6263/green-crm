export const LANDING_NAV_ITEMS = [
  { label: "Features", href: "/#features" },
  { label: "Field App", href: "/#field-app" },
  { label: "How It Works", href: "/#workflow" },
  { label: "Why GreenCRM", href: "/#why-greencrm" },
  { label: "FAQ", href: "/#faq" },
];

// Shown on the page and reused for the FAQPage structured data, so both stay in sync.
export const FAQ_ITEMS = [
  {
    question: "What is GreenCRM?",
    answer:
      "GreenCRM is a sales CRM built for Indian businesses. It brings leads, follow-ups, calling, WhatsApp, tasks, attendance and field tracking into one workspace, with an Android app for sales staff.",
  },
  {
    question: "Is there a mobile app for my sales team?",
    answer:
      "Yes. Sales staff get an Android app to work on their leads and tasks, add notes and follow-ups, attach photos to leads, and record their field route with GPS.",
  },
  {
    question: "Does GPS tracking work without internet?",
    answer:
      "Yes. Route tracking and visit check-ins are saved on the phone in encrypted storage and upload automatically when the network is back. Tracking starts only when the employee taps Start tracking.",
  },
  {
    question: "Does GreenCRM support WhatsApp and calling?",
    answer:
      "Yes. Your team can call, send WhatsApp messages, SMS and email from inside the CRM, and every conversation is logged on the lead.",
  },
  {
    question: "Can I import my leads from Excel?",
    answer:
      "Yes. Download the template, fill in your leads and upload the CSV. You see a preview before importing and an error report for any row that needs fixing.",
  },
  {
    question: "Who can see which data?",
    answer:
      "Access is role-based. Sales reps see their own leads, managers see their team, and admins see the whole company. Every company's data is kept separate and important actions are recorded in audit logs.",
  },
  {
    question: "Can deals move from sales to legal and finance?",
    answer:
      "Yes. When sales marks a deal as won, it moves to the legal team for agreements and then to finance for invoices and payment, so everyone works from the same record.",
  },
  {
    question: "How much does GreenCRM cost?",
    answer:
      "Pricing depends on your team size and the features you need. Book a free demo or message us on WhatsApp and we will share a plan for your team.",
  },
];

export const HERO_TAGS = ["Lead ownership", "Follow-up notes", "Role-based access"];

export const TRUST_STATS = [
  { value: "1", label: "shared workspace", note: "Leads, tasks, notes, and customer context stay together." },
  { value: "5", label: "step workflow", note: "Capture, assign, follow up, track history, close cleanly." },
  { value: "4", label: "quick actions", note: "Call, WhatsApp, email, and tasks stay one click away." },
  { value: "24/7", label: "team visibility", note: "Managers know who owns each lead and what happens next." },
];

export const PROBLEM_ITEMS = [
  { title: "Missed follow-ups", copy: "Important callbacks and next steps get delayed when reminders live in different places." },
  { title: "Scattered customer data", copy: "Calls, notes, tasks, and documents end up split across chats, sheets, and inboxes." },
  { title: "No ownership clarity", copy: "Teams lose momentum when nobody can clearly see who owns the next action." },
];

export const FEATURE_HIGHLIGHTS = [
  { icon: "layers", title: "Lead Management", copy: "Capture leads, update status, and keep the pipeline clean without extra steps." },
  { icon: "notes", title: "Follow-up Notes", copy: "Save call outcomes, customer context, and next steps right where the team works." },
  { icon: "history", title: "Follow-up History", copy: "See calls, notes, updates, and movement in one running lead timeline." },
  { icon: "calendar", title: "Task Scheduling", copy: "Turn the next step into a scheduled follow-up before the lead goes cold." },
  { icon: "users", title: "Team Ownership", copy: "Assign the right owner, add collaborators, and keep accountability visible." },
  { icon: "documents", title: "Customer Documents", copy: "Store files with the lead so agreements, briefs, and proof stay easy to find." },
];

export const WORKFLOW_STEPS = [
  { step: "01", title: "Capture lead", note: "Bring every enquiry into one clean record." },
  { step: "02", title: "Assign owner", note: "Make ownership clear from the start." },
  { step: "03", title: "Add follow-up", note: "Log the next step while the context is fresh." },
  { step: "04", title: "Track history", note: "See every call, note, task, and update in order." },
  { step: "05", title: "Close deal", note: "Move the lead forward with less confusion and less delay." },
];

export const WHY_ITEMS = [
  { icon: "spark", title: "Simple for teams", copy: "Sales and admin users can understand the workspace in minutes." },
  { icon: "pulse", title: "Built for follow-ups", copy: "The product keeps the next action visible so leads do not go quiet." },
  { icon: "grid", title: "Fast and clean", copy: "The UI stays light, readable, and focused on daily execution." },
  { icon: "shield", title: "Role-based access", copy: "Each user sees the right records, actions, and workflow responsibilities." },
];

export const CTA_POINTS = ["Clean handoff between users", "One place for daily follow-up work", "Easy for small and growing teams"];

export const FOOTER_LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Workflow", href: "/#workflow" },
      { label: "Why GreenCRM", href: "/#why-greencrm" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "CRM Software India", href: "/crm-software-india" },
      { label: "CRM in Noida", href: "/crm-in-noida" },
      { label: "CRM with Calling", href: "/crm-with-calling" },
      { label: "CRM with WhatsApp", href: "/crm-with-whatsapp" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "What is CRM Software", href: "/blog/what-is-crm-software" },
      { label: "Best CRM Tools India", href: "/blog/best-crm-tools-india" },
      { label: "Why Sales Team Needs CRM", href: "/blog/why-sales-team-needs-crm" },
    ],
  },
  {
    title: "Actions",
    links: [
      { label: "Book Demo", href: "/book-demo" },
      { label: "Login", href: "/login" },
      { label: "Create Workspace", href: "/register" },
    ],
  },
];
