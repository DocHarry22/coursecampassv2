import React from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, info) {
    if (typeof console !== "undefined") {
      console.error("App render error captured by boundary:", error, info);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box minHeight="100vh" display="grid" placeItems="center" px={2} bgcolor="#f8fafc">
        <Stack spacing={1.5} maxWidth={560} width="100%">
          <Typography variant="h5" fontWeight={800} color="#0f172a">
            Course Campass encountered an unexpected error
          </Typography>
          <Alert severity="error">
            {this.state.error?.message || "Something went wrong while rendering this screen."}
          </Alert>
          <Button variant="contained" onClick={this.handleReset} sx={{ alignSelf: "flex-start" }}>
            Try rendering again
          </Button>
        </Stack>
      </Box>
    );
  }
}

export default AppErrorBoundary;
