import React from "react";

export const useLocalStorageState = (storageKey, defaultValue) => {
  const [value, setValue] = React.useState(() => {
    if (typeof window === "undefined") {
      return defaultValue;
    }

    try {
      const cachedValue = window.localStorage.getItem(storageKey);
      return cachedValue ? JSON.parse(cachedValue) : defaultValue;
    } catch (_error) {
      return defaultValue;
    }
  });

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (_error) {
      // Storage writes can fail in private mode or full quota situations.
    }
  }, [storageKey, value]);

  return [value, setValue];
};
