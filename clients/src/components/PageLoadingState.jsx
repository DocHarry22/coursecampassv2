import React from "react";
import { Box, Skeleton, Stack } from "@mui/material";

const PageLoadingState = ({ rows = 3 }) => {
  return (
    <Stack spacing={1.25} role="status" aria-live="polite" aria-label="Loading content">
      <Skeleton variant="rounded" height={44} />
      {Array.from({ length: rows }).map((_, index) => (
        <Box key={index}>
          <Skeleton variant="rounded" height={110} />
        </Box>
      ))}
    </Stack>
  );
};

export default PageLoadingState;
