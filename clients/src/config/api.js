export const getApiBaseUrl = () => {
  const configuredApiBaseUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (import.meta.env.PROD) {
    throw new Error(
      "VITE_API_URL is required for production builds. Hostinger serves only the static frontend, so point VITE_API_URL to your external Node API before deploying."
    );
  }

  return "http://localhost:5001";
};
