import { randomUUID } from "crypto";

const REQUEST_ID_HEADER = "x-request-id";

const getRequestId = (req) => {
  const incoming = req.get(REQUEST_ID_HEADER);

  if (!incoming) {
    return randomUUID();
  }

  const normalized = String(incoming).trim();
  return normalized ? normalized.slice(0, 128) : randomUUID();
};

export const requestContext = (req, res, next) => {
  const requestId = getRequestId(req);

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};
