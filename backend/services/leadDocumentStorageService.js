const fs = require("node:fs/promises");
const path = require("node:path");

const AppError = require("../utils/appError");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");
const LEAD_UPLOAD_ROOT = path.join(UPLOAD_ROOT, "leads");
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
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
    .replace(/[^\w.\- ()]/g, "_")
    .replace(/\s+/g, " ")
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
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${token}${extension}`;
}

async function storeLeadDocument({ buffer, companyId, contentType, fileName, leadId }) {
  const safeFileName = assertAllowedDocument(fileName, contentType, buffer?.length || 0);
  const storedFileName = buildStoredFileName(safeFileName);
  const targetDir = path.join(LEAD_UPLOAD_ROOT, companyId, leadId);
  const targetPath = path.join(targetDir, storedFileName);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, buffer);

  return {
    contentType,
    fileName: safeFileName,
    fileSize: buffer.length,
    fileUrl: `/uploads/leads/${companyId}/${leadId}/${storedFileName}`,
  };
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
  storeLeadDocument,
};
