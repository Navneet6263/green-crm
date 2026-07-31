# GreenCRM — Features & Role Guide
> Client ke liye: CRM kaise kaam karta hai, kaun kya karta hai

---

## ROLES — KAUN KAUN HAI

| Role | Matlab |
|------|--------|
| `super-admin` | Platform ka malik (Navneet) — sab kuch dekh sakta hai |
| `platform-admin` | Platform operator — companies manage karta hai |
| `platform-manager` | Platform level manager |
| `admin` | Company ka head — apni company ka sab kuch |
| `manager` | Team lead — apni team dekh sakta hai |
| `sales` | Sales rep — sirf apne leads |
| `marketing` | Marketing team — leads dekh sakta, limited access |
| `legal-team` | Legal department — sirf legal stage ke leads |
| `finance-team` | Finance department — sirf finance stage ke leads |
| `expert` | Field agent — apne assigned leads aur tasks |
| `support` | Support agent — support tickets |
| `viewer` | Read only — sirf dekh sakta hai, kuch nahi kar sakta |

---

## PORTALS — KIS KA KYA KAAM HAI

---

### 1. SUPER ADMIN PORTAL
**Kaun use karta hai:** Navneet (platform owner)

- Sabhi companies dekh sakta hai ek jagah se
- Nayi company bana sakta hai, suspend kar sakta hai
- Kisi bhi company ke andar ja sakta hai (impersonate)
- Sabhi users dekh sakta hai across all companies
- Demo requests dekh sakta hai (jo log demo maangte hain website se)
- Audit logs dekh sakta hai — kisne kya kiya, kab kiya
- Security alerts — agar koi zyada export kare toh alert aata hai
- Super admin max 4 ho sakte hain (limit fixed hai)

---

### 2. ADMIN PORTAL
**Kaun use karta hai:** Company ka head/owner

- Apni company ke saare leads dekh sakta hai
- Team members add/remove kar sakta hai
- Roles assign kar sakta hai (sales, manager, legal, etc.)
- Products manage kar sakta hai
- Lead kisi bhi team member ko assign kar sakta hai
- Workflow dekh sakta hai (sales → legal → finance)
- Company settings change kar sakta hai (logo, timezone, currency, SMTP)
- Lead statuses customize kar sakta hai (apne hisaab se status naam rakh sakta hai)
- Analytics dekh sakta hai — full company reports
- Bulk lead upload kar sakta hai (CSV se)
- Teams bana sakta hai aur members add kar sakta hai
- Attendance records dekh sakta hai (sabke)
- Export kar sakta hai leads (CSV, Excel, HTML)

---

### 3. MANAGER PORTAL
**Kaun use karta hai:** Team lead

- Apni team ke saare leads dekh sakta hai
- Lead apni team ke andar assign/reassign kar sakta hai
- Team performance dekh sakta hai
- Analytics dekh sakta hai (team level)
- Tasks assign kar sakta hai team ko
- Bulk lead upload kar sakta hai
- Export kar sakta hai
- Attendance history dekh sakta hai

---

### 4. SALES REP PORTAL
**Kaun use karta hai:** Sales executive

- Sirf apne assigned leads dekh sakta hai
- Lead ka status change kar sakta hai
  - new → contacted → qualified → proposal → negotiation → closed-won / closed-lost
- Notes add kar sakta hai lead pe
- Follow-up date set kar sakta hai
- Documents upload kar sakta hai lead pe
- Tasks dekh sakta hai aur complete kar sakta hai
- Calendar pe meetings/follow-ups dekh sakta hai
- Communications log kar sakta hai (call, email, WhatsApp)
- Jab lead "closed-won" karta hai → automatically legal team ke paas chali jaati hai

---

### 5. LEGAL TEAM PORTAL
**Kaun use karta hai:** Legal department

- Sirf wo leads dikhti hain jo sales ne "closed-won" ki hain
- Agreement documents upload kar sakta hai
- Agreement status update kar sakta hai (pending → approved)
- Jab legal kaam complete ho → lead finance team ke paas jaati hai
- Documents manage kar sakta hai

---

### 6. FINANCE TEAM PORTAL
**Kaun use karta hai:** Finance department

- Sirf wo leads dikhti hain jo legal ne complete ki hain
- Invoice number add kar sakta hai
- Invoice amount set kar sakta hai
- Tax invoice number add kar sakta hai
- Payment track kar sakta hai
- Jab sab complete → lead "completed" ho jaati hai
- Documents upload kar sakta hai

---

### 7. EXPERT PORTAL
**Kaun use karta hai:** Field agent / specialist

- Apne assigned leads dekh sakta hai
- Tasks dekh aur complete kar sakta hai
- Notes add kar sakta hai
- Attendance punch in/out kar sakta hai

---

### 8. MARKETING PORTAL
**Kaun use karta hai:** Marketing team

- Leads dekh sakta hai (assign nahi kar sakta)
- New lead bana sakta hai
- Tasks dekh sakta hai
- Calendar dekh sakta hai

---

### 9. VIEWER PORTAL
**Kaun use karta hai:** Read-only user (client, auditor)

- Sirf leads dekh sakta hai
- Kuch bhi change nahi kar sakta

---

## LEAD KA SAFAR — START SE END TAK

```
Lead banta hai
      ↓
Sales rep kaam karta hai
(status: new → contacted → qualified → proposal → negotiation)
      ↓
Sales rep "Closed Won" karta hai
      ↓
Legal team ko jaati hai (documents, agreement)
      ↓
Legal complete karta hai
      ↓
Finance team ko jaati hai (invoice, payment)
      ↓
COMPLETED ✓
```

Agar deal nahi bani → "Closed Lost" → end

---

## EXTRA FEATURES JO IMPLEMENT HAIN

### Teams
- Admin teams bana sakta hai (e.g. "Delhi Team", "Mumbai Team")
- Har team ke members alag hote hain
- Lead ek specific team ko assign ho sakti hai
- Manager sirf apni team dekh sakta hai

### Attendance
- Punch In / Punch Out system
- Admin/Manager sabki attendance history dekh sakta hai
- Location bhi capture hoti hai punch ke time

### Chat (Internal)
- Team ke andar direct message kar sakte hain
- Group chat bana sakte hain
- Real-time messages (SSE based)

### Notes
- Lead pe notes add kar sakte hain
- Customer pe bhi notes
- Notes pin kar sakte hain
- Tags laga sakte hain notes pe
- Recent notes ek jagah se dekh sakte hain

### Customization
- Admin lead statuses customize kar sakta hai
- Lead form fields on/off kar sakta hai
- Custom fields add kar sakta hai

### Recent Updates
- Ek page jahan saari recent activity dikhti hai
- Filter kar sakte hain date se
- Export bhi kar sakte hain

### Notifications
- Lead assign hone pe notification aati hai
- Follow-up reminder aata hai
- System alerts bhi aate hain

### Communications Log
- Call log kar sakte hain
- Email log kar sakte hain
- WhatsApp log kar sakte hain
- Sab ek jagah dikhta hai

### Analytics
- Lead source wise breakdown
- Status wise breakdown
- Team performance charts
- Pipeline value

### Documents
- Lead pe documents upload kar sakte hain
- Legal documents alag, finance documents alag
- Download kar sakte hain

### Bulk Upload
- CSV se ek saath hazaron leads upload kar sakte hain
- Template download kar sakte hain
- Preview dikhta hai upload se pehle
- Error report aata hai agar koi row galat ho

### Export
- Leads export kar sakte hain CSV, Excel, HTML format mein
- Filters apply karke export kar sakte hain
- Daily export limit hai (security ke liye)

### Lead History
- Har lead ki poori history dikhti hai
- Kisne kya kiya, kab kiya — sab track hota hai

### Workflow Tracker
- Admin/Manager dekh sakta hai kaun si lead kahan hai
- Sales → Legal → Finance pipeline ek jagah dikhti hai

### Landing Pages (SEO)
- Website pe blog articles hain
- Book Demo page hai
- CRM feature pages hain (SEO ke liye)

---

## SECURITY

- Login attempts limit hai — 5 baar galat password → account lock
- Har action audit log mein jaata hai
- Bulk export pe super-admin ko alert jaata hai
- Har user sirf apni company ka data dekh sakta hai
- Token logout pe blacklist ho jaata hai

---

*GreenCRM — Built for Indian sales teams*
