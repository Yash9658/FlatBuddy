import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AdminOverview, AdminReport, AdminUser, PropertyItem } from "@/lib/types";

export function useAdminOverview(token: string | null, refreshKey = 0) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [listings, setListings] = useState<PropertyItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadAdminData() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [listingsResponse, overviewResponse, reportsResponse, usersResponse] = await Promise.all([
          apiFetch<PropertyItem[]>("/admin/listings", {
            method: "GET",
            token,
          }),
          apiFetch<AdminOverview>("/admin/overview", {
            method: "GET",
            token,
          }),
          apiFetch<AdminReport[]>("/admin/reports", {
            method: "GET",
            token,
          }),
          apiFetch<AdminUser[]>("/admin/users", {
            method: "GET",
            token,
          }),
        ]);

        if (!ignore) {
          setListings(listingsResponse);
          setOverview(overviewResponse);
          setReports(reportsResponse);
          setUsers(usersResponse);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load admin dashboard.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminData();

    return () => {
      ignore = true;
    };
  }, [token, refreshKey]);

  return {
    overview,
    reports,
    listings,
    users,
    isLoading,
    error,
  };
}
