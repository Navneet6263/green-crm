const { executeChannelAction } = require("./channelDispatchService");

async function sendMessage(auth, payload) {
  return executeChannelAction(auth, "whatsapp", payload, "sendMessage");
}

module.exports = {
  sendMessage,
};
