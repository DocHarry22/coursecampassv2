import React from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";

const RouteLoadingState = () => {
  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      minHeight="100vh"
      sx={{ backgroundColor: "#f8fbff" }}
      px={{ xs: 1.5, md: 2 }}
      py={{ xs: 1.5, md: 2 }}
    >
      <Typography
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
          p: 0,
          m: -1,
        }}
      >
        Loading route content
      </Typography>

      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={56} />
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap={1.25}>
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={120} />
        </Box>
        <Skeleton variant="rounded" height={280} />
      </Stack>
    </Box>
  );
};

export default RouteLoadingState;
