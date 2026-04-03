import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CityOverview } from "@/lib/types";
import { featuredCities } from "@/data/mock";

export function useCityOverview(slug: string | undefined) {
  const [city, setCity] = useState<CityOverview | null>(
    () => {
      const fallback = featuredCities.find((item) => item.slug === slug);

      return fallback
        ? {
            ...fallback,
            seekers: [],
            properties: [],
          }
        : null;
    },
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCity() {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch<CityOverview>(`/cities/${slug}`, { method: "GET" });
        if (!ignore) {
          setCity(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load city.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadCity();

    return () => {
      ignore = true;
    };
  }, [slug]);

  return {
    city,
    isLoading,
    error,
  };
}
