export const BULK_IMPORT_MAX_ROWS = 250;

export const BULK_IMPORT_FIELDS = [
  {
    key: "company_id",
    label: "Company Code",
    required: "Super admin only",
    example: "CI0001",
    note: "Tenant users can leave this blank.",
  },
  {
    key: "product_id",
    label: "Product Code",
    required: "Yes",
    example: "PI0001",
    note: "Must match an active product in that company.",
  },
  {
    key: "assigned_to",
    label: "Owner Code",
    required: "Optional",
    example: "UI0003",
    note: "Leave blank to keep the lead with the current importer.",
  },
  {
    key: "contact_person",
    label: "Contact Person",
    required: "Yes",
    example: "Navneet Kumar",
    note: "Decision maker or contact person name.",
  },
  {
    key: "company_name",
    label: "Company Name",
    required: "Yes",
    example: "Vision India",
    note: "Lead company or prospect name.",
  },
  {
    key: "email",
    label: "Email",
    required: "Optional",
    example: "navneet.kumar@greencall.com.in",
    note: "Primary contact email if available.",
  },
  {
    key: "phone",
    label: "Phone",
    required: "Yes",
    example: "7004023078",
    note: "7 to 15 digits is ideal.",
  },
  {
    key: "industry",
    label: "Industry",
    required: "Optional",
    example: "education",
    note: "Use the same simple values as the Add Lead form.",
  },
  {
    key: "lead_source",
    label: "Lead Source",
    required: "Optional",
    example: "google",
    note: "If blank, GreenCRM keeps website as default.",
  },
  {
    key: "follow_up_date",
    label: "Follow-up Date",
    required: "Optional",
    example: "2026-04-08 10:24",
    note: "Use a readable date-time value.",
  },
  {
    key: "estimated_value",
    label: "Estimated Value",
    required: "Optional",
    example: "3000",
    note: "Numeric amount only. Currency symbol is not needed.",
  },
  {
    key: "priority",
    label: "Priority",
    required: "Optional",
    example: "high",
    note: "Allowed: low, medium, high.",
  },
  {
    key: "address_street",
    label: "Street Address",
    required: "Optional",
    example: "Sector 62",
    note: "Service address or office location.",
  },
  {
    key: "address_city",
    label: "City",
    required: "Optional",
    example: "Noida",
    note: "City name only.",
  },
  {
    key: "address_state",
    label: "State",
    required: "Optional",
    example: "Uttar Pradesh",
    note: "State or region.",
  },
  {
    key: "address_zip",
    label: "Postal Code",
    required: "Optional",
    example: "201301",
    note: "PIN or ZIP code.",
  },
  {
    key: "address_country",
    label: "Country",
    required: "Optional",
    example: "India",
    note: "If blank, GreenCRM uses India.",
  },
];

export const BULK_IMPORT_COLUMNS = BULK_IMPORT_FIELDS.map((field) => field.key);
export const BULK_IMPORT_SAMPLE_VALUES = BULK_IMPORT_FIELDS.map((field) => field.example);

export const BULK_IMPORT_SAMPLE_ROW = BULK_IMPORT_SAMPLE_VALUES.join("\t");

export const BULK_IMPORT_TEMPLATE = BULK_IMPORT_COLUMNS.join("\t");

function escapeDelimitedValue(value, delimiter) {
  const normalized = String(value ?? "");

  if (normalized.includes('"')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  if (normalized.includes(delimiter) || normalized.includes("\n") || normalized.includes("\r")) {
    return `"${normalized}"`;
  }

  return normalized;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseDelimitedRows(text, delimiter) {
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

    if (!inQuotes && char === delimiter) {
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

  return rows;
}

export function parseLeadBulkImportText(text) {
  const source = String(text || "").trim();
  if (!source) {
    return {
      rows: [],
      rowCount: 0,
      hasHeader: false,
      delimiter: "tab",
      preview: null,
    };
  }

  const delimiter = source.includes("\t") ? "\t" : ",";
  const parsedRows = parseDelimitedRows(source, delimiter);

  if (!parsedRows.length) {
    return {
      rows: [],
      rowCount: 0,
      hasHeader: false,
      delimiter: delimiter === "\t" ? "tab" : "csv",
      preview: null,
    };
  }

  const firstRow = parsedRows[0].map(normalizeHeader);
  const hasHeader =
    firstRow.length === BULK_IMPORT_COLUMNS.length &&
    firstRow.every((column, index) => column === BULK_IMPORT_COLUMNS[index]);
  const dataRows = hasHeader ? parsedRows.slice(1) : parsedRows;

  if (!dataRows.length) {
    throw new Error("Paste at least one lead row after the template header.");
  }

  if (dataRows.length > BULK_IMPORT_MAX_ROWS) {
    throw new Error(`Upload limit is ${BULK_IMPORT_MAX_ROWS} rows at a time.`);
  }

  const rows = dataRows.map((cells, index) => {
    const rowNumber = hasHeader ? index + 2 : index + 1;

    if (cells.length !== BULK_IMPORT_COLUMNS.length) {
      throw new Error(
        `Row ${rowNumber} must contain exactly ${BULK_IMPORT_COLUMNS.length} columns in the GreenCRM import order.`
      );
    }

    const record = { __row_number: rowNumber };
    BULK_IMPORT_COLUMNS.forEach((column, columnIndex) => {
      record[column] = cells[columnIndex] || "";
    });
    return record;
  });

  return {
    rows,
    rowCount: rows.length,
    hasHeader,
    delimiter: delimiter === "\t" ? "tab" : "csv",
    preview: rows[0]
      ? {
          company_id: rows[0].company_id,
          contact_person: rows[0].contact_person,
          company_name: rows[0].company_name,
          product_id: rows[0].product_id,
        }
      : null,
  };
}

export function buildLeadBulkImportExample() {
  return [BULK_IMPORT_TEMPLATE, BULK_IMPORT_SAMPLE_ROW].join("\n");
}

export function buildLeadBulkImportSheet({ includeSample = false, delimiter = "," } = {}) {
  const rows = [BULK_IMPORT_COLUMNS];

  if (includeSample) {
    rows.push(BULK_IMPORT_SAMPLE_VALUES);
  }

  return rows
    .map((row) => row.map((cell) => escapeDelimitedValue(cell, delimiter)).join(delimiter))
    .join("\n");
}
