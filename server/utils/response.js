const sanitizeHeaderValue = (value) =>
  String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 180);

export const applyResponseMetadata = (res, { source = "database", fallbackReason = null } = {}) => {
  res.setHeader("X-Data-Source", sanitizeHeaderValue(source) || "database");

  if (fallbackReason) {
    res.setHeader("X-Fallback-Reason", sanitizeHeaderValue(fallbackReason));
    return;
  }

  res.removeHeader("X-Fallback-Reason");
};

export const sendApiResponse = (res, statusCode, payload, metadata = undefined) => {
  applyResponseMetadata(res, metadata);
  return res.status(statusCode).json(payload);
};
