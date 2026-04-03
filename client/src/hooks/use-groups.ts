import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { GroupItem } from "@/lib/types";

export function useGroups(token: string | null, refreshKey = 0) {
  const [groups, setGroups] = useState<GroupItem[]>([]);
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
        const response = await apiFetch<GroupItem[]>("/groups", {
          method: "GET",
          token,
        });

        if (!ignore) {
          setGroups(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load groups.");
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

  return { groups, isLoading, error };
}

export function useGroupDetail(groupId: string | undefined, token: string | null, refreshKey = 0) {
  const [group, setGroup] = useState<GroupItem | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(groupId && token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadGroup() {
      if (!groupId || !token) {
        setGroup(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiFetch<GroupItem>(`/groups/${groupId}`, {
          method: "GET",
          token,
        });

        if (!ignore) {
          setGroup(response);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load group.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadGroup();

    return () => {
      ignore = true;
    };
  }, [groupId, refreshKey, token]);

  return { group, isLoading, error };
}
