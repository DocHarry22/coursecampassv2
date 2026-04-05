const parseOriginList = () =>
  String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isDevelopment = () => (process.env.NODE_ENV || "development") !== "production";

export const buildCorsOptions = () => {
  const allowedOrigins = new Set(parseOriginList());

  return {
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server) and same-origin requests.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      if (isDevelopment()) {
        callback(null, true);
        return;
      }

      const corsError = new Error("Origin is not allowed by CORS policy.");
      corsError.statusCode = 403;
      corsError.code = "CORS_ORIGIN_DENIED";
      callback(corsError);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id", "X-Data-Source", "X-Fallback-Reason"],
    credentials: true,
    maxAge: 60 * 60 * 24,
  };
};

export const getHelmetOptions = () => {
  const production = !isDevelopment();

  return {
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: production
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    contentSecurityPolicy: false,
  };
};

export const configureExpressSecurity = (app) => {
  app.disable("x-powered-by");

  const trustProxy = String(process.env.TRUST_PROXY || "").trim();

  if (trustProxy) {
    if (trustProxy === "true") {
      app.set("trust proxy", true);
      return;
    }

    const asNumber = Number.parseInt(trustProxy, 10);
    app.set("trust proxy", Number.isNaN(asNumber) ? trustProxy : asNumber);
    return;
  }

  if ((process.env.NODE_ENV || "development") === "production") {
    app.set("trust proxy", 1);
  }
};
