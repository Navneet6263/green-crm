/**
 * Response Wrapper Middleware
 *
 * Standardizes all API responses to a consistent shape:
 *   Success:  { success: true, data: <payload>, meta: <pagination|null> }
 *   Error:    { success: false, error: <message>, code: <code|null>, details: <details|null> }
 *
 * Controllers can still call res.json() normally — this middleware intercepts
 * and wraps the payload transparently, so no controller changes are needed.
 *
 * Skips wrapping if:
 *  - Response is already wrapped (has `success` key)
 *  - Status code is 204 (no content)
 *  - Content-Type is not JSON
 */

function responseWrapper(_req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function wrapJson(payload) {
    // Already wrapped or non-object — pass through
    if (
      payload === null ||
      payload === undefined ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.prototype.hasOwnProperty.call(payload, "success")
    ) {
      return originalJson(payload);
    }

    const statusCode = res.statusCode || 200;

    // Error responses (4xx / 5xx) — wrap as failure
    if (statusCode >= 400) {
      return originalJson({
        success: false,
        error: payload.error || "An error occurred.",
        code: payload.code || null,
        details: payload.details || null,
      });
    }

    // Extract pagination meta if present (our buildPaginatedResult shape)
    const hasMeta = Object.prototype.hasOwnProperty.call(payload, "meta");
    const hasItems = Object.prototype.hasOwnProperty.call(payload, "items");

    if (hasMeta && hasItems) {
      // Paginated list response
      return originalJson({
        success: true,
        data: payload.items,
        meta: payload.meta,
      });
    }

    // Single-object or plain response — wrap data
    const dataPayload = Object.prototype.hasOwnProperty.call(payload, "data")
      ? payload.data
      : payload;

    return originalJson({
      success: true,
      data: dataPayload,
      meta: null,
    });
  };

  next();
}

module.exports = responseWrapper;
