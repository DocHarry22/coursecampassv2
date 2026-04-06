import React from "react";
import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { apiGetManySettled } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";
import RouteEmptyState from "../../components/RouteEmptyState";
import RouteStatusBanners from "../../components/RouteStatusBanners";

const formatValue = (value) => {
  if (typeof value === "number") {
    return value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value === null || value === undefined || value === "") {
    return "n/a";
  }

  return String(value);
};

const toSummaryCards = (responses) =>
  Object.entries(responses).map(([key, payload]) => {
    if (Array.isArray(payload)) {
      return {
        key,
        label: key,
        value: payload.length,
        note: payload[0]?.name || payload[0]?.email || "Data loaded",
      };
    }

    const objectPayload = payload && typeof payload === "object" ? payload : {};
    const firstKey = Object.keys(objectPayload)[0];

    return {
      key,
      label: key,
      value: Object.keys(objectPayload).length,
      note: firstKey ? `${firstKey}: ${formatValue(objectPayload[firstKey])}` : "No properties returned",
    };
  });

const formatFailureDetails = (keys, errors) =>
  keys
    .map((key) => {
      const message = errors?.[key]?.message;
      return message ? `${key}: ${message}` : key;
    })
    .join(" | ");

const DestinationScene = ({ title, subtitle, requests = [] }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [warning, setWarning] = React.useState("");
  const [cards, setCards] = React.useState([]);

  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");
      setWarning("");

      try {
        const { data, errors, summary } = await apiGetManySettled(requests);

        if (!isMounted) {
          return;
        }

        const nextCards = toSummaryCards(data);

        if (!nextCards.length && summary.hasFailures) {
          const detailText = formatFailureDetails(summary.failedKeys, errors);
          throw new Error(`Unable to load route data (${detailText}).`);
        }

        setCards(nextCards);

        if (summary.hasFailures) {
          const detailText = formatFailureDetails(summary.failedKeys, errors);
          setWarning(`Some route data is temporarily unavailable (${detailText}).`);
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError.message || "Unable to load route data.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [requests]);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>

      <RouteStatusBanners error={error} warning={warning} />

      {loading ? <PageLoadingState rows={2} /> : null}

      {!loading && !cards.length && !error ? (
        <RouteEmptyState message="No route data is available for this section yet." />
      ) : null}

      {!loading && cards.length ? (
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }}
          gap={1.5}
        >
          {cards.map((card) => (
            <Card key={card.key}>
              <CardContent>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  {card.label}
                </Typography>
                <Typography variant="h4" color="text.primary" fontWeight={800}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.note}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : null}
    </Stack>
  );
};

export default DestinationScene;
