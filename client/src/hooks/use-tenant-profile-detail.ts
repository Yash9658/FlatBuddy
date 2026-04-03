import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { TenantProfileDetail } from "@/lib/types";

export function useTenantProfileDetail(userId: string | undefined, token: string | null, refreshKey = 0) {
  const [detail, setDetail] = useState<TenantProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId && token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      if (!userId || !token) {
        setDetail(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch<TenantProfileDetail>(`/profile/users/${userId}`, {
          method: "GET",
          token,
        });

        if (!ignore) {
          setDetail(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load tenant profile.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      ignore = true;
    };
  }, [refreshKey, token, userId]);

  return {
    detail,
    isLoading,
    error,
  };
}
