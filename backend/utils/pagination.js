function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function decodeBase64Url(value) {
  const normalized = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(`${normalized}${"=".repeat(paddingLength)}`, "base64").toString("utf8");
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeCursor(rawCursor) {
  if (!rawCursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeBase64Url(rawCursor));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function parsePagination(query = {}) {
  const page = parsePositiveInteger(query.page, 1);
  const pageSize = Math.min(parsePositiveInteger(query.page_size || query.pageSize, 10), 100);
  const rawCursor = query.cursor || query.next_cursor || null;
  const cursor = decodeCursor(rawCursor);

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    rawCursor: cursor ? String(rawCursor) : null,
    cursor,
  };
}

function buildPaginatedResult(items, total, pagination, pageInfo = null) {
  const meta = {
    page_size: pagination.pageSize,
  };

  if (pageInfo?.cursorBased) {
    meta.mode = "cursor";
    meta.cursor = pagination.rawCursor;
    meta.has_more = Boolean(pageInfo.hasMore);
    meta.next_cursor = pageInfo.nextCursor || null;

    if (typeof total === "number") {
      meta.total = total;
      meta.total_pages = Math.max(Math.ceil(total / pagination.pageSize), 1);
    }
  } else {
    meta.mode = "page";
    meta.page = pagination.page;
    meta.total = total;
    meta.total_pages = Math.max(Math.ceil(total / pagination.pageSize), 1);
  }

  return {
    items,
    meta,
  };
}

module.exports = {
  buildPaginatedResult,
  encodeCursor,
  parsePagination,
};
