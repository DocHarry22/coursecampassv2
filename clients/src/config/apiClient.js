import { getApiBaseUrl } from "./api";

const DEFAULT_HEADERS = {
  Accept: "application/json",
};

const RETRY_EXCLUDED_PATHS = new Set(["/auth/login", "/auth/refresh"]);
let accessToken = null;
let refreshInFlight = null;

export class ApiClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = details.status ?? null;
    this.path = details.path ?? "";
    this.payload = details.payload;
  }
}

const normalizePath = (path) => (path.startsWith("/") ? path : `/${path}`);

const buildUrl = (path) => `${getApiBaseUrl()}${normalizePath(path)}`;

export const setApiAccessToken = (token) => {
  accessToken = token ? String(token) : null;
};

const getApiAccessToken = () => accessToken;

const parseResponsePayload = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const textPayload = await response.text();
  return textPayload || null;
};

const tryRefreshAccessToken = async () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(buildUrl("/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          ...DEFAULT_HEADERS,
        },
      });

      const payload = await parseResponsePayload(response);

      if (!response.ok) {
        throw new ApiClientError("Request failed for /auth/refresh.", {
          status: response.status,
          path: "/auth/refresh",
          payload,
        });
      }

      const refreshedToken = payload?.accessToken || null;
      setApiAccessToken(refreshedToken);
      return refreshedToken;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

export const apiRequest = async (path, options = {}) => {
  const normalizedPath = normalizePath(path);
  const {
    includeAuth = true,
    skipAuthRefresh = false,
    headers,
    credentials,
    ...requestOptions
  } = options;

  const token = getApiAccessToken();
  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...(headers || {}),
  };

  if (includeAuth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const url = buildUrl(path);
  let response = await fetch(url, {
    ...requestOptions,
    credentials: credentials || "include",
    headers: requestHeaders,
  });

  let payload = await parseResponsePayload(response);

  if (
    response.status === 401 &&
    includeAuth &&
    !skipAuthRefresh &&
    !RETRY_EXCLUDED_PATHS.has(normalizedPath)
  ) {
    try {
      const refreshedToken = await tryRefreshAccessToken();

      if (refreshedToken) {
        response = await fetch(url, {
          ...requestOptions,
          credentials: credentials || "include",
          headers: {
            ...requestHeaders,
            Authorization: `Bearer ${refreshedToken}`,
          },
        });

        payload = await parseResponsePayload(response);
      }
    } catch (_refreshError) {
      setApiAccessToken(null);
    }
  }

  if (!response.ok) {
    throw new ApiClientError(`Request failed for ${normalizedPath}.`, {
      status: response.status,
      path: normalizedPath,
      payload,
    });
  }

  return payload;
};

export const apiGet = (path, options = {}) => apiRequest(path, { ...options, method: "GET" });
export const apiPost = (path, body, options = {}) =>
  apiRequest(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

export const apiPatch = (path, body, options = {}) =>
  apiRequest(path, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

export const apiDelete = (path, options = {}) =>
  apiRequest(path, {
    ...options,
    method: "DELETE",
  });

export const apiGetMany = async (requests) => {
  const entries = await Promise.all(
    requests.map(async (request) => {
      const data = await apiGet(request.path, request.options);
      return [request.key, data];
    })
  );

  return Object.fromEntries(entries);
};

const normalizeBatchRequestError = (reason, fallbackPath = "") => {
  const payload = reason?.payload;
  const message =
    payload?.error?.message ||
    payload?.message ||
    reason?.message ||
    `Request failed${fallbackPath ? ` for ${fallbackPath}` : ""}.`;

  return {
    message,
    status: Number.isFinite(reason?.status) ? reason.status : null,
    path: reason?.path || fallbackPath,
    payload,
    raw: reason,
  };
};

export const apiGetManySettled = async (requests, options = {}) => {
  const requiredKeys = new Set(
    Array.isArray(options?.requiredKeys)
      ? options.requiredKeys.map((key) => String(key || "")).filter(Boolean)
      : []
  );

  const fallbackData =
    options?.fallbackData && typeof options.fallbackData === "object" ? options.fallbackData : {};

  const settledResults = await Promise.allSettled(
    requests.map((request) => apiGet(request.path, request.options))
  );

  const data = {};
  const errors = {};
  const results = {};
  const failedKeys = [];
  const requiredFailureKeys = [];
  const optionalFailureKeys = [];

  settledResults.forEach((result, index) => {
    const request = requests[index] || {};
    const key = request?.key;

    if (!key) {
      return;
    }

    const isRequired = Boolean(request.required) || requiredKeys.has(key);

    if (result.status === "fulfilled") {
      data[key] = result.value;
      results[key] = {
        key,
        ok: true,
        required: isRequired,
        data: result.value,
        error: null,
      };
      return;
    }

    const normalizedError = normalizeBatchRequestError(result.reason, request.path);
    errors[key] = normalizedError;
    results[key] = {
      key,
      ok: false,
      required: isRequired,
      data: null,
      error: normalizedError,
    };

    if (Object.prototype.hasOwnProperty.call(fallbackData, key)) {
      data[key] = fallbackData[key];
    }

    failedKeys.push(key);

    if (isRequired) {
      requiredFailureKeys.push(key);
      return;
    }

    optionalFailureKeys.push(key);
  });

  return {
    data,
    errors,
    results,
    summary: {
      total: requests.length,
      successCount: requests.length - failedKeys.length,
      failureCount: failedKeys.length,
      failedKeys,
      requiredFailureKeys,
      optionalFailureKeys,
      hasFailures: failedKeys.length > 0,
      hasRequiredFailures: requiredFailureKeys.length > 0,
      hasOptionalFailures: optionalFailureKeys.length > 0,
    },
  };
};
