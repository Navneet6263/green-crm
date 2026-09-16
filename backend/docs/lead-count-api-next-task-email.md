# Next-task email

Owner note: Send after this additive update is deployed and authenticated GET
shows the new fields. Do not include a real key or real employee data in this email.
The example below is dummy data. The original key keeps its original expiry.

**Subject: Next task - Add follow-up reporting to your CRM bot**

Hi [Name],

We have added a few fields to the same CRM API for the next stage of your project.
The URL, GET method and authentication remain unchanged. Keep using the existing
valid key; you do not need to create a new one. Its existing expiry still applies.

```text
GET https://greencall.online/api/integrations/v1/employee-lead-counts
Authorization: Bearer <your existing key>
```

The original `employee_name` and `lead_count` fields are still available. The new
fields are:

- **employee_id:** identifies each employee, even when two names are the same.
- **open_lead_count:** the employee's leads that are not in a terminal status.
- **today_follow_up_count:** open leads scheduled for follow-up today, India time.
- **overdue_follow_up_count:** open leads with follow-up dates before today.

Here is a dummy sample of one employee in the `data` array:

```json
{
  "employee_id": "sample-user-001",
  "employee_name": "Ravi",
  "lead_count": 12,
  "open_lead_count": 8,
  "today_follow_up_count": 3,
  "overdue_follow_up_count": 2
}
```

Please first update your Python database to save these fields. Use employee ID,
not name, to identify a person. On the first updated fetch, replace the old
name-only CRM snapshot in one transaction. Future refreshes should replace the
complete CRM snapshot without duplicating rows or retaining removed employees.
Do not modify another product's saved data. A failed refresh must preserve the
last successful snapshot; missing new fields must not be treated as zero.

Then extend the bot to answer questions such as:

- How many open leads does an employee have?
- How many follow-ups are scheduled for today?
- Which employee has the most overdue follow-ups?

These follow-up counts come from open leads' scheduled follow-up dates, not the
separate task manager. Today's and overdue counts do not overlap. They do not
prove that a call was missed; the CRM dates must be kept up to date. Use
`meta.report_as_of` with `meta.timezone` to identify the report day and show
`meta.fetched_at` as the last successful API fetch. If saved data belongs to an
older day, say that clearly instead of presenting it as today's data.

**Access stays read-only.** You may process and analyse the downloaded data in
your own approved local database. This key does not give you direct CRM database
access or permission to create, edit or delete CRM records. Do not build CRM
write-back actions. Revenue, customer details and individual lead records are
still not provided.

Keep the key and real CRM data private. Do not paste them into AI tools, upload
them to GitHub, include them in screenshots, or share them with others. AI help
for coding is fine with dummy data and `<API_KEY>` placeholders only. Keep real
secrets/database files outside any files shared with AI tools. Inform us promptly
if anything is accidentally exposed.

For the demo, show one refresh, the saved fields and the new bot answers. Include
tests for zero counts, duplicate names, repeated refreshes, stale data and failed
API calls. Keep the connector, database and bot logic separate for future JustJob
and GreenHR integrations.

Thanks,
[Your Name]
