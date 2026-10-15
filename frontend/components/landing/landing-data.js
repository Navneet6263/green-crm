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

const GREENCALL_SITE = "https://www.greencall.in";

// Parent company details, as published on greencall.in.
export const COMPANY = {
  name: "Green Call Technology",
  website: GREENCALL_SITE,
  streetAddress: "A-43, Sector 67",
  locality: "Noida",
  region: "Uttar Pradesh",
  postalCode: "201301",
  address: "A-43, Sector 67, Noida, Gautam Buddha Nagar, UP 201301, India",
  mapUrl: "https://maps.google.com/?q=A-43+Sector+67+Noida+Uttar+Pradesh+201301",
  phone: "+91 120 310 1985",
  phoneHref: "tel:+911203101985",
  email: "reachus@greencall.in",
  whatsappHref: "https://wa.me/917004023078?text=Hi%2C%20I%20want%20to%20know%20about%20GreenCRM",
  socials: [
    { name: "LinkedIn", href: "https://www.linkedin.com/company/green-call-technology" },
    { name: "Facebook", href: "https://www.facebook.com/greencalltechnology" },
    { name: "Instagram", href: "https://www.instagram.com/greencalltechnology/" },
    { name: "X", href: "https://x.com/greencalltech" },
    { name: "YouTube", href: "https://www.youtube.com/@greencalltechnology" },
  ],
};

export const FOOTER_LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Field Sales App", href: "/#field-app" },
      { label: "How It Works", href: "/#workflow" },
      { label: "Why GreenCRM", href: "/#why-greencrm" },
      { label: "FAQ", href: "/#faq" },
      { label: "Book a Demo", href: "/book-demo" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "CRM Software India", href: "/crm-software-india" },
      { label: "CRM in Noida", href: "/crm-in-noida" },
      { label: "CRM for Small Business", href: "/crm-for-small-business" },
      { label: "CRM for Startups", href: "/crm-for-startups" },
      { label: "CRM for Sales Teams", href: "/crm-for-sales-team" },
      { label: "CRM with Calling", href: "/crm-with-calling" },
      { label: "CRM with WhatsApp", href: "/crm-with-whatsapp" },
      { label: "CRM with Attendance", href: "/crm-with-attendance" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "What is CRM Software", href: "/blog/what-is-crm-software" },
      { label: "CRM vs Excel", href: "/blog/crm-vs-excel-for-sales" },
      { label: "Best CRM Tools India", href: "/blog/best-crm-tools-india" },
      { label: "Why Sales Teams Need CRM", href: "/blog/why-sales-team-needs-crm" },
      { label: "CRM for Startups", href: "/blog/benefits-of-crm-for-startups" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Green Call", href: `${GREENCALL_SITE}/about-us.aspx`, external: true },
      { label: "Careers", href: `${GREENCALL_SITE}/careers.aspx`, external: true },
      { label: "Contact Us", href: `${GREENCALL_SITE}/contact-us.aspx`, external: true },
      { label: "Login", href: "/login" },
      { label: "Create Workspace", href: "/register" },
    ],
  },
];

export const SISTER_PRODUCTS = [
  { label: "GreenHR", href: "https://www.greenhr.in" },
  { label: "Payroll Management", href: `${GREENCALL_SITE}/payroll-management-software.aspx` },
  { label: "Call Center CRM", href: `${GREENCALL_SITE}/call-center-crm.aspx` },
  { label: "Green Comply", href: `${GREENCALL_SITE}/vendor-management.aspx` },
  { label: "Job Portal", href: `${GREENCALL_SITE}/job-portal-software.aspx` },
];

export const LEGAL_LINKS = [
  { label: "Privacy Policy", href: `${GREENCALL_SITE}/privacy-policy.aspx` },
  { label: "Terms of Use", href: `${GREENCALL_SITE}/term-of-use.aspx` },
  { label: "Disclaimer", href: `${GREENCALL_SITE}/disclaimer.aspx` },
];
