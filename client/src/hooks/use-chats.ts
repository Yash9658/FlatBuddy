import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ChatThread } from "@/lib/types";

export function useChats(token: string | null, refreshKey = 0) {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadChats() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch<ChatThread[]>("/chats", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setChats(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load inbox.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadChats();

    return () => {
      ignore = true;
    };
  }, [refreshKey, token]);

  return {
    chats,
    isLoading,
    error,
  };
}
