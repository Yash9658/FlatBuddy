import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { getPostAuthRoute } from "@/lib/auth-routing";
import type { UserRole } from "@/lib/types";

type GuardedRouteProps = {
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
};

export function GuardedRoute({
  requireAuth = true,
  allowedRoles,
}: GuardedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking your session</CardTitle>
          <CardDescription>FlatBuddy is loading your access right now.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (requireAuth && !user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (
    user &&
    !user.isProfileComplete &&
    location.pathname !== "/welcome" &&
    location.pathname !== "/setup/tenant" &&
    location.pathname !== "/setup/landlord" &&
    location.pathname !== "/profile" &&
    location.pathname !== "/landlord"
  ) {
    return (
      <Navigate
        replace
        state={{ from: location.pathname }}
        to={getPostAuthRoute(user)}
      />
    );
  }

  if (
    user?.role === "ADMIN" &&
    (location.pathname === "/welcome" ||
      location.pathname === "/setup/tenant" ||
      location.pathname === "/setup/landlord")
  ) {
    return <Navigate replace state={{ from: location.pathname }} to={getPostAuthRoute(user)} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access limited to the right role</CardTitle>
          <CardDescription>
            This section is available only for {allowedRoles.map((role) => role.toLowerCase()).join(" or ")} accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You are currently signed in as {user.role.toLowerCase()}.
        </CardContent>
      </Card>
    );
  }

  return <Outlet />;
}
