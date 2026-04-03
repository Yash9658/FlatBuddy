import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { SavedPropertyItem, SavedUserItem } from "@/lib/types";

export function useSavedUsers(token: string | null, refreshKey = 0) {
  const [items, setItems] = useState<SavedUserItem[]>([]);
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
        const response = await apiFetch<SavedUserItem[]>("/saved/users", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setItems(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load saved users.");
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

  return { items, isLoading, error };
}

export function useSavedProperties(token: string | null, refreshKey = 0) {
  const [items, setItems] = useState<SavedPropertyItem[]>([]);
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
        const response = await apiFetch<SavedPropertyItem[]>("/saved/properties", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setItems(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load saved properties.");
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

  return { items, isLoading, error };
}
