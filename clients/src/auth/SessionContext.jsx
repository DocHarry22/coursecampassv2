import React from "react";
import { apiGet, apiPatch, apiPost, setApiAccessToken } from "../config/apiClient";

const SESSION_STORAGE_KEY = "coursecampass.session.v1";

const SessionContext = React.createContext(null);

const defaultPreferences = {
  language: "English",
  timezone: "Africa/Johannesburg",
  marketingUpdates: true,
};

const CANONICAL_ROLES = ["user", "admin", "superadmin"];

export const normalizeSessionRole = (value) => {
  const normalized = String(value || "user").trim().toLowerCase();
  return CANONICAL_ROLES.includes(normalized) ? normalized : "user";
};

export const getRoleHomePath = (role) => {
  const normalizedRole = normalizeSessionRole(role);

  if (normalizedRole === "superadmin") {
    return "/superadmin/dashboard";
  }

  if (normalizedRole === "admin") {
    return "/admin/dashboard";
  }

  return "/dashboard";
};

const buildRoleCapabilities = (role) => {
  const normalizedRole = normalizeSessionRole(role);
  const isAdminLike = normalizedRole === "admin" || normalizedRole === "superadmin";
  const isSuperadmin = normalizedRole === "superadmin";

  return {
    role: normalizedRole,
    roleHomePath: getRoleHomePath(normalizedRole),
    canAccessDashboard: true,
    canAccessUserDashboard: normalizedRole === "user",
    canAccessAdminDashboard: normalizedRole === "admin",
    canAccessSuperadminDashboard: normalizedRole === "superadmin",
    canAccessTools: true,
    canAccessFinancialAid: true,
    canAccessTodo: true,
    canAccessCalendar: true,
    canAccessAccount: true,
    canAccessSearch: isAdminLike,
    canAccessCourseDiscovery: isAdminLike,
    canAccessSchoolComparison: isAdminLike,
    canAccessAdminOperations: isAdminLike,
    canAccessGovernance: isSuperadmin,
    canAccessObservability: isSuperadmin,
    showLearnerSection: true,
    showAdminSection: isAdminLike,
    showSuperadminSection: isSuperadmin,
    isAdminLike,
    isSuperadmin,
  };
};

const createSessionFromProfile = (profile, remember, accessToken, previousSession = null) => ({
  id: profile?._id || previousSession?.id || `local-${Date.now()}`,
  name: profile?.name || previousSession?.name || "CourseCampass Learner",
  email: profile?.email || previousSession?.email || "",
  role: normalizeSessionRole(profile?.role || previousSession?.role || "user"),
  country: profile?.country || previousSession?.country || "Unknown",
  preferences: {
    ...defaultPreferences,
    ...(previousSession?.preferences || {}),
  },
  accessToken: accessToken || previousSession?.accessToken || null,
  loggedInAt: previousSession?.loggedInAt || new Date().toISOString(),
  remember,
});

const readSession = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (_error) {
    return null;
  }
};

const writeSession = (session) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const SessionProvider = ({ children }) => {
  const [session, setSession] = React.useState(readSession);

  React.useEffect(() => {
    setApiAccessToken(session?.accessToken || null);
  }, [session?.accessToken]);

  const login = React.useCallback(async ({ email, password, remember }) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "").trim();

    if (!normalizedEmail || !normalizedPassword) {
      throw new Error("Email and password are required.");
    }

    const response = await apiPost(
      "/auth/login",
      {
        email: normalizedEmail,
        password: normalizedPassword,
      },
      {
        includeAuth: false,
        skipAuthRefresh: true,
      }
    );

    if (!response?.accessToken || !response?.user) {
      throw new Error("Login response was incomplete.");
    }

    setApiAccessToken(response.accessToken);

    const nextSession = createSessionFromProfile(response.user, Boolean(remember), response.accessToken);

    setSession(nextSession);
    writeSession(nextSession);
    return nextSession;
  }, []);

  const logout = React.useCallback(() => {
    apiPost(
      "/auth/logout",
      {},
      {
        includeAuth: false,
        skipAuthRefresh: true,
      }
    ).catch(() => {
      // Local session state is still cleared even if logout request fails.
    });

    setApiAccessToken(null);
    setSession(null);
    writeSession(null);
  }, []);

  const updateSessionProfile = React.useCallback(async (updates) => {
    setSession((previousSession) => {
      if (!previousSession) {
        return previousSession;
      }

      const serverPayload = {};
      if (typeof updates?.name === "string") {
        serverPayload.name = updates.name;
      }
      if (typeof updates?.email === "string") {
        serverPayload.email = updates.email;
      }
      if (typeof updates?.country === "string") {
        serverPayload.country = updates.country;
      }

      const applyLocalMerge = (profileFromServer = null) => {
        const nextSession = createSessionFromProfile(
          profileFromServer || {
            _id: previousSession.id,
            name: updates?.name ?? previousSession.name,
            email: updates?.email ?? previousSession.email,
            role: previousSession.role,
            country: updates?.country ?? previousSession.country,
          },
          previousSession.remember,
          previousSession.accessToken,
          previousSession
        );

        nextSession.preferences = {
          ...previousSession.preferences,
          ...(updates?.preferences || {}),
        };

        writeSession(nextSession);
        return nextSession;
      };

      if (Object.keys(serverPayload).length) {
        apiPatch("/account/profile", serverPayload)
          .then((response) => {
            setSession((latestSession) => {
              if (!latestSession) {
                return latestSession;
              }

              const mergedSession = createSessionFromProfile(
                response?.user || {},
                latestSession.remember,
                latestSession.accessToken,
                latestSession
              );

              mergedSession.preferences = {
                ...latestSession.preferences,
                ...(updates?.preferences || {}),
              };

              writeSession(mergedSession);
              return mergedSession;
            });
          })
          .catch(() => {
            // Preserve local UX continuity even when profile persistence fails.
          });
      }

      return applyLocalMerge();
    });
  }, []);

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    let isMounted = true;

    const syncSessionUser = async () => {
      try {
        const response = await apiGet("/auth/me");

        if (!isMounted || !response?.user) {
          return;
        }

        setSession((previousSession) => {
          if (!previousSession) {
            return previousSession;
          }

          const nextSession = createSessionFromProfile(
            response.user,
            previousSession.remember,
            previousSession.accessToken,
            previousSession
          );

          nextSession.preferences = {
            ...defaultPreferences,
            ...(previousSession.preferences || {}),
          };

          writeSession(nextSession);
          return nextSession;
        });
      } catch (_error) {
        if (!isMounted) {
          return;
        }

        setApiAccessToken(null);
        setSession(null);
        writeSession(null);
      }
    };

    syncSessionUser();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const value = React.useMemo(
    () => {
      const capabilities = buildRoleCapabilities(session?.role);

      return {
        session,
        isAuthenticated: Boolean(session),
        role: capabilities.role,
        roleHomePath: capabilities.roleHomePath,
        capabilities,
        login,
        logout,
        updateSessionProfile,
      };
    },
    [session, login, logout, updateSessionProfile]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = React.useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
};
