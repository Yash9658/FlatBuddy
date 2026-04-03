import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ConnectionItem } from "@/lib/types";

export function useConnections(token: string | null, refreshKey = 0) {
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadConnections() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch<ConnectionItem[]>("/connections", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setConnections(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load requests.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadConnections();

    return () => {
      ignore = true;
    };
  }, [refreshKey, token]);

  return {
    connections,
    isLoading,
    error,
  };
}
