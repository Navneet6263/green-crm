// A company row as it may leave the server: the mail server password is never sent,
// only whether one is saved. Login, profile and the company APIs all go through this.
function publicCompany(company) {
  if (!company || typeof company !== "object") return company;
  const { smtp_password: password, ...rest } = company;
  return { ...rest, smtp_password_set: Boolean(password) };
}

module.exports = { publicCompany };
