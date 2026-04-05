import React from "react";
import { Alert, Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { apiGetMany } from "../../config/apiClient";
import PageLoadingState from "../../components/PageLoadingState";

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

const DestinationScene = ({ title, subtitle, requests = [] }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [cards, setCards] = React.useState([]);

  React.useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const responses = await apiGetMany(requests);

        if (!isMounted) {
          return;
        }

        setCards(toSummaryCards(responses));
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
        <Typography variant="body2" color="#64748b" mb={0.5}>
          {title}
        </Typography>
        <Typography variant="caption" color="#94a3b8">
          {subtitle}
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? <PageLoadingState rows={2} /> : null}

      {!loading ? (
        <Box display="grid" gridTemplateColumns={{ xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap={1.5}>
          {cards.map((card) => (
            <Card key={card.key} sx={{ backgroundImage: "none", boxShadow: "none", border: "1px solid #dbe6f3", borderRadius: 2.5 }}>
              <CardContent>
                <Typography variant="caption" color="#64748b" fontWeight={700}>
                  {card.label}
                </Typography>
                <Typography variant="h4" color="#0f172a" fontWeight={800}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="#475569">
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
