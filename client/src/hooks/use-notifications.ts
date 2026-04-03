import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { NotificationFeed } from "@/lib/types";

export function useNotifications(token: string | null, refreshKey = 0) {
  const [feed, setFeed] = useState<NotificationFeed>({ notifications: [], unreadCount: 0 });
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadNotifications() {
      if (!token) {
        setFeed({ notifications: [], unreadCount: 0 });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch<NotificationFeed>("/notifications", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setFeed(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load notifications.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadNotifications();

    return () => {
      ignore = true;
    };
  }, [refreshKey, token]);

  return {
    notifications: feed.notifications,
    unreadCount: feed.unreadCount,
    isLoading,
    error,
  };
}
