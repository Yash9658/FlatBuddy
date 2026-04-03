import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { VisitRequestItem } from "@/lib/types";

export function useVisits(token: string | null, refreshKey = 0) {
  const [visits, setVisits] = useState<VisitRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch<VisitRequestItem[]>("/visits", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setVisits(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load visit requests.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [refreshKey, token]);

  return {
    visits,
    isLoading,
    error,
  };
}
