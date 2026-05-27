import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { City } from "@/lib/types";
import { featuredCities } from "@/data/mock";

type UseCitiesOptions = {
  allowFallback?: boolean;
};

export function useCities({ allowFallback = true }: UseCitiesOptions = {}) {
  const [cities, setCities] = useState<City[]>(allowFallback ? featuredCities : []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCities() {
      try {
        const response = await apiFetch<City[]>("/cities", { method: "GET" });
        if (!ignore) {
          const usableCities = allowFallback ? response : response.filter((city) => Boolean(city.id));
          setCities(usableCities);
          setError(usableCities.length > 0 ? null : "No database cities are available from the server.");
        }
      } catch (loadError) {
        if (!ignore) {
          setCities(allowFallback ? featuredCities : []);
          setError(loadError instanceof Error ? loadError.message : "Unable to load cities.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadCities();

    return () => {
      ignore = true;
    };
  }, [allowFallback]);

  return {
    cities,
    isLoading,
    error,
  };
}
