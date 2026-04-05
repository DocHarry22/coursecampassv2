import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../auth/SessionContext";

export const RequireSession = () => {
  const location = useLocation();
  const { isAuthenticated } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export const RedirectIfAuthenticated = () => {
  const { isAuthenticated, roleHomePath } = useSession();

  if (isAuthenticated) {
    return <Navigate to={roleHomePath} replace />;
  }

  return <Outlet />;
};

export const RedirectToRoleDashboard = () => {
  const { roleHomePath } = useSession();
  return <Navigate to={roleHomePath} replace />;
};

export const RequireRoles = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const { isAuthenticated, role, roleHomePath } = useSession();
  const normalizedAllowedRoles = allowedRoles.map((entry) => String(entry || "").trim().toLowerCase());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!normalizedAllowedRoles.includes(role)) {
    return <Navigate to={roleHomePath} replace />;
  }

  return <Outlet />;
};

export const RequireCapability = ({ capability }) => {
  const location = useLocation();
  const { isAuthenticated, capabilities, roleHomePath } = useSession();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!capability || !capabilities?.[capability]) {
    return <Navigate to={roleHomePath} replace />;
  }

  return <Outlet />;
};
