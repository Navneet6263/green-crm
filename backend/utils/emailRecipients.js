function parseRecipientList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))];
  }

  return [...new Set(
    String(value || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )];
}

module.exports = {
  parseRecipientList,
};
