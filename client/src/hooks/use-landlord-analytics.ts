import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { LandlordAnalytics } from "@/lib/types";

export function useLandlordAnalytics(token: string | null, refreshKey = 0) {
  const [analytics, setAnalytics] = useState<LandlordAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch<LandlordAnalytics>("/properties/analytics", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setAnalytics(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load landlord analytics.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [refreshKey, token]);

  return {
    analytics,
    isLoading,
    error,
  };
}
