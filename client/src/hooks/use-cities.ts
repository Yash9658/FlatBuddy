import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { City } from "@/lib/types";
import { featuredCities } from "@/data/mock";

export function useCities() {
  const [cities, setCities] = useState<City[]>(featuredCities);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCities() {
      try {
        const response = await apiFetch<City[]>("/cities", { method: "GET" });
        if (!ignore && response.length > 0) {
          setCities(response);
        }
      } catch (loadError) {
        if (!ignore) {
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
  }, []);

  return {
    cities,
    isLoading,
    error,
  };
}
