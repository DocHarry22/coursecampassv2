import React from "react";
import { Alert, Stack } from "@mui/material";

const normalizeEntries = (value, defaultSeverity) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry) {
          return null;
        }

        if (typeof entry === "string") {
          return { severity: defaultSeverity, message: entry };
        }

        return {
          severity: entry.severity || defaultSeverity,
          message: entry.message || "",
        };
      })
      .filter((entry) => entry?.message);
  }

  if (typeof value === "string") {
    return [{ severity: defaultSeverity, message: value }];
  }

  return value.message
    ? [{ severity: value.severity || defaultSeverity, message: value.message }]
    : [];
};

const RouteStatusBanners = ({ success, error, warning, info }) => {
  const entries = [
    ...normalizeEntries(success, "success"),
    ...normalizeEntries(error, "error"),
    ...normalizeEntries(warning, "warning"),
    ...normalizeEntries(info, "info"),
  ];

  if (!entries.length) {
    return null;
  }

  return (
    <Stack spacing={1}>
      {entries.map((entry, index) => (
        <Alert key={`${entry.severity}-${index}`} severity={entry.severity}>
          {entry.message}
        </Alert>
      ))}
    </Stack>
  );
};

export default RouteStatusBanners;
