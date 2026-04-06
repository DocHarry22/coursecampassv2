import React from "react";
import { Alert } from "@mui/material";

const RouteEmptyState = ({ message = "No records are available yet." }) => {
  return <Alert severity="info">{message}</Alert>;
};

export default RouteEmptyState;
