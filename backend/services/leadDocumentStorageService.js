const fs = require("node:fs/promises");
const path = require("node:path");

const AppError = require("../utils/appError");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const LEAD_UPLOAD_ROOT = path.join(UPLOAD_ROOT, "leads");
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

function sanitizeFileName(fileName) {
  let normalizedName = String(fileName || "document").trim();
  try {
    normalizedName = decodeURIComponent(normalizedName);
  } catch (_error) {
    normalizedName = String(fileName || "document").trim();
  }

  const cleaned = path
    .basename(normalizedName)
    .replace(/[^\w.\-()]/g, "_")
    .replace(/_+/g, "_")
    .trim();

  return cleaned || "document";
}

function isAllowedContentType(contentType) {
  const normalized = String(contentType || "").toLowerCase();
  return (
    normalized.startsWith("image/")
    || normalized === "application/pdf"
    || normalized === "application/msword"
    || normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || normalized === "application/vnd.ms-excel"
    || normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function assertAllowedDocument(fileName, contentType, fileSize) {
  if (!fileSize) {
    throw new AppError("A document file is required.", 400);
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    throw new AppError("Document size must be 15 MB or less.", 400);
  }

  const safeFileName = sanitizeFileName(fileName);
  const extension = path.extname(safeFileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension) || !isAllowedContentType(contentType)) {
    throw new AppError("Only PDF, image, DOC, and DOCX files are allowed.", 400);
  }

  return safeFileName;
}

function buildStoredFileName(originalFileName) {
  const extension = path.extname(originalFileName).toLowerCase();
  const baseName = path.basename(originalFileName, extension).replace(/[^\w\-()]/g, "_").slice(0, 80) || "document";
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${token}-${baseName}${extension}`;
}

function normalizeDocumentType(documentType) {
  const normalized = String(documentType || "general").toLowerCase();
  return ["general", "legal", "finance"].includes(normalized) ? normalized : "general";
}

async function storeLeadDocument({ buffer, companyId, contentType, documentType = "general", fileName, leadId }) {
  const safeFileName = assertAllowedDocument(fileName, contentType, buffer?.length || 0);
  const storedFileName = buildStoredFileName(safeFileName);
  const type = normalizeDocumentType(documentType);
  const targetDir = path.join(LEAD_UPLOAD_ROOT, companyId, leadId, type);
  const targetPath = path.join(targetDir, storedFileName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return {
    contentType,
    fileName: safeFileName,
    fileSize: buffer.length,
    fileUrl: `/uploads/leads/${companyId}/${leadId}/${type}/${storedFileName}`,
  };
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let offset = 0;
  let index = buffer.indexOf(separator, offset);
  while (index !== -1) {
    parts.push(buffer.slice(offset, index));
    offset = index + separator.length;
    index = buffer.indexOf(separator, offset);
  }
  parts.push(buffer.slice(offset));
  return parts;
}

function parseMultipartFormData(body, contentType) {
  const boundary = String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[1] || String(contentType || "").match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.[2];
  if (!boundary || !Buffer.isBuffer(body)) {
    throw new AppError("Invalid multipart upload.", 400);
  }

  const fields = {};
  let file = null;
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  for (const rawPart of splitBuffer(body, boundaryBuffer)) {
    let part = rawPart;
    if (part.length < 8 || part.slice(0, 4).toString() === "--\r\n") continue;
    if (part.slice(0, 2).toString() === "\r\n") part = part.slice(2);
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = part.slice(0, headerEnd).toString("utf8");
    let content = part.slice(headerEnd + 4);
    if (content.slice(-2).toString() === "\r\n") content = content.slice(0, -2);
    const disposition = headerText.match(/content-disposition:\s*([^\r\n]+)/i)?.[1] || "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    const partContentType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim();
    if (!name) continue;
    if (filename) file = { buffer: content, contentType: partContentType || "application/octet-stream", fieldName: name, fileName: filename };
    else fields[name] = content.toString("utf8");
  }

  return { fields, file };
}

async function deleteStoredLeadDocument(fileUrl) {
  const normalizedPath = String(fileUrl || "").replace(/^\/+/, "");
  if (!normalizedPath.startsWith("uploads/leads/")) {
    return;
  }

  const absolutePath = path.join(__dirname, "..", normalizedPath);
  await fs.rm(absolutePath, { force: true });
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  UPLOAD_ROOT,
  deleteStoredLeadDocument,
  parseMultipartFormData,
  storeLeadDocument,
};
