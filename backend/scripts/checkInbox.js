// Checks the Microsoft 365 inbox setup from the server: node scripts/checkInbox.js
// Prints only the result, never the secret.
require("dotenv").config();
const inbox = require("../services/mail/graphInbox");

inbox.testConnection().then((result) => {
  if (result.ok) {
    console.log(`OK: the CRM can read ${result.mailbox}.${result.latest ? ` Newest email: ${result.latest}.` : " The inbox is empty."}`);
    return;
  }
  console.error(`Not working${result.mailbox ? ` for ${result.mailbox}` : ""}: ${result.error}`);
  // exitCode (not exit()) lets Node close the network handles cleanly on Windows.
  process.exitCode = 1;
});
