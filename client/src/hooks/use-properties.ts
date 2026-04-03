import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PropertyItem, PropertyType } from "@/lib/types";

type UsePropertiesOptions = {
  city?: string;
  type?: PropertyType;
  mine?: boolean;
  token?: string | null;
  refreshKey?: number;
};

export function useProperties(options: UsePropertiesOptions = {}) {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadProperties() {
      if (options.mine && !options.token) {
        if (!ignore) {
          setProperties([]);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const path = options.mine
          ? "/properties/mine"
          : `/properties${buildQueryString({
              city: options.city,
              type: options.type,
            })}`;

        const response = await apiFetch<PropertyItem[]>(path, {
          method: "GET",
          token: options.token,
        });

        if (!ignore) {
          setProperties(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load properties.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadProperties();

    return () => {
      ignore = true;
    };
  }, [options.city, options.mine, options.refreshKey, options.token, options.type]);

  return {
    properties,
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
