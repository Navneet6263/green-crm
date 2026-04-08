function parseCsv(text) {
  const source = String(text || "").trim();

  if (!source) {
    return [];
  }

  const rows = [];
  let currentCell = "";
  let currentRow = [];
  let inQuotes = false;

  const pushCell = () => {
    currentRow.push(currentCell.trim());
    currentCell = "";
  };

  const pushRow = () => {
    if (currentRow.length > 1 || currentRow[0]) {
      rows.push(currentRow);
    }

    currentRow = [];
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (!inQuotes && char === ",") {
      pushCell();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      pushCell();
      pushRow();
      continue;
    }

    currentCell += char;
  }

  pushCell();
  pushRow();

  if (!rows.length) {
    return [];
  }

  const headers = rows.shift().map((header) =>
    header
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
  );

  return rows.map((row) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = row[index] || "";
    });

    return record;
  });
}

module.exports = {
  parseCsv,
};
