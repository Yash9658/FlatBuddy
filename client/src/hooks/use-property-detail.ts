import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { PropertyDetail } from "@/lib/types";

export function usePropertyDetail(propertyId: string | undefined, token?: string | null, refreshKey = 0) {
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(propertyId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadPropertyDetail() {
      if (!propertyId) {
        setDetail(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch<PropertyDetail>(`/properties/${propertyId}`, {
          method: "GET",
          token,
        });

        if (!ignore) {
          setDetail(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load property details.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadPropertyDetail();

    return () => {
      ignore = true;
    };
  }, [propertyId, refreshKey, token]);

  return {
    detail,
    isLoading,
    error,
  };
}
