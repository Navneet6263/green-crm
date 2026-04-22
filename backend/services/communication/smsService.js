const { executeChannelAction } = require("./channelDispatchService");

async function sendSMS(auth, payload) {
  return executeChannelAction(auth, "sms", payload, "sendSMS");
}

module.exports = {
  sendSMS,
};
