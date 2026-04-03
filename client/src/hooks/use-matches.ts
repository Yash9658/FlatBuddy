import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { MatchItem, OccupationType } from "@/lib/types";

type MatchFilters = {
  minCompatibility?: number;
  occupation?: OccupationType;
  interest?: string;
};

export function useMatches(token: string | null, filters: MatchFilters = {}) {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadMatches() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch<MatchItem[]>(
          `/matches${buildQueryString({
            minCompatibility: filters.minCompatibility?.toString(),
            occupation: filters.occupation,
            interest: filters.interest?.trim() || undefined,
          })}`,
          {
            method: "GET",
            token,
          },
        );

        if (!ignore) {
          setMatches(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load matches.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadMatches();

    return () => {
      ignore = true;
    };
  }, [filters.interest, filters.minCompatibility, filters.occupation, token]);

  return {
    matches,
    isLoading,
    error,
  };
}

function buildQueryString(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}
