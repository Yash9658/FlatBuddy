import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ChatThread } from "@/lib/types";

export function useChatDetail(chatId: string | null, token: string | null, refreshKey = 0) {
  const [chat, setChat] = useState<ChatThread | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(chatId && token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadChat() {
      if (!chatId || !token) {
        setIsLoading(false);
        setChat(null);
        return;
      }

      try {
        const response = await apiFetch<ChatThread>(`/chats/${chatId}/messages`, {
          method: "GET",
          token,
        });

        if (!ignore) {
          setChat(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load chat.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadChat();

    return () => {
      ignore = true;
    };
  }, [chatId, refreshKey, token]);

  return {
    chat,
    isLoading,
    error,
  };
}
