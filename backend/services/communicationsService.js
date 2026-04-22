const emailDeskService = require("./communication/emailDeskService");

module.exports = {
  sendEntityEmail: emailDeskService.sendEntityEmail,
  sendTestEmail: emailDeskService.sendTestEmail,
};
