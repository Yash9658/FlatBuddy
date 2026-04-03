import { MapPin, Search, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { useToast } from "@/context/toast-context";
import { useConnections } from "@/hooks/use-connections";
import { useMatches } from "@/hooks/use-matches";
import { useSavedUsers } from "@/hooks/use-saved";
import { apiFetch } from "@/lib/api";
import { FREE_TENANT_PENDING_REQUEST_LIMIT, hasActivePlan } from "@/lib/subscription";
import type { ConnectionItem, OccupationType } from "@/lib/types";

const occupationOptions: Array<{ label: string; value: OccupationType | "" }> = [
  { label: "Any occupation", value: "" },
  { label: "Student", value: "STUDENT" },
  { label: "Working professional", value: "WORKING_PROFESSIONAL" },
  { label: "Freelancer", value: "FREELANCER" },
  { label: "Other", value: "OTHER" },
];

const compatibilityOptions = [0, 50, 60, 70, 80, 90];

export function MatchesPage() {
  const { accessToken, user } = useAuth();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [minCompatibility, setMinCompatibility] = useState(0);
  const [occupation, setOccupation] = useState<OccupationType | "">("");
  const [interest, setInterest] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"compatibility" | "budget" | "city">("compatibility");
  const { connections } = useConnections(accessToken, refreshKey);
  const { items: savedUsers } = useSavedUsers(accessToken, savedRefreshKey);
  const hasTenantPro = user?.role === "ADMIN" || hasActivePlan(user, "TENANT_PRO");
  const { matches, isLoading, error } = useMatches(accessToken, {
    minCompatibility: hasTenantPro && minCompatibility > 0 ? minCompatibility : undefined,
    occupation: hasTenantPro && occupation ? occupation : undefined,
    interest: hasTenantPro ? interest : undefined,
  });
  const pendingSentCount = connections.filter(
    (connection) => connection.sender.id === user?.id && connection.status === "PENDING",
  ).length;
  const reachedFreeRequestLimit = !hasTenantPro && pendingSentCount >= FREE_TENANT_PENDING_REQUEST_LIMIT;

  const connectionLookup = useMemo(() => {
    const lookup = new Map<string, { status: string; isReceiver: boolean; chatId?: string | null; id: string }>();

    connections.forEach((connection) => {
      const otherUserId =
        connection.sender.id === user?.id ? connection.receiver.id : connection.sender.id;

      lookup.set(otherUserId, {
        status: connection.status,
        isReceiver: connection.receiver.id === user?.id,
        chatId: connection.chatId,
        id: connection.id,
      });
    });

    return lookup;
  }, [connections, user?.id]);

  const savedUserIds = useMemo(() => new Set(savedUsers.map((item) => item.target.id)), [savedUsers]);

  const filteredMatches = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = matches.filter((match) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        match.user.profile?.fullName,
        match.user.email,
        match.user.profile?.preferredArea,
        match.user.profile?.targetCity?.name,
        ...(match.user.preference?.interests ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    const sorted = [...filtered];
    sorted.sort((left, right) => {
      if (sortBy === "budget") {
        return (left.user.profile?.budgetMin ?? 0) - (right.user.profile?.budgetMin ?? 0);
      }

      if (sortBy === "city") {
        return (left.user.profile?.targetCity?.name ?? "").localeCompare(right.user.profile?.targetCity?.name ?? "");
      }

      return right.compatibilityScore - left.compatibilityScore;
    });

    return sorted;
  }, [matches, searchTerm, sortBy]);

  const acceptedConnectionsCount = connections.filter((connection) => connection.status === "ACCEPTED").length;
  const highCompatibilityCount = filteredMatches.filter((match) => match.compatibilityScore >= 80).length;

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to see tenant partner matches</CardTitle>
          <CardDescription>Your city and lifestyle settings unlock the partner finder.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleConnect(targetUserId: string, targetCityId?: string | null) {
    setPendingUserId(targetUserId);
    setActionMessage(null);

    try {
      await apiFetch("/connections", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          receiverId: targetUserId,
          cityId: targetCityId ?? undefined,
          message: "Hey, our FlatBuddy preferences look aligned. Want to explore places together?",
        }),
      });
      setActionMessage("Connection request sent.");
      showToast({ title: "Request sent", description: "Your partner request is now in their inbox.", variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (submitError) {
      setActionMessage(
        submitError instanceof Error ? submitError.message : "Unable to send connection request.",
      );
      showToast({
        title: "Request failed",
        description: submitError instanceof Error ? submitError.message : "Unable to send connection request.",
        variant: "error",
      });
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleSaveUser(targetUserId: string) {
    setActionMessage(null);

    try {
      if (savedUserIds.has(targetUserId)) {
        await apiFetch(`/saved/users/${targetUserId}`, {
          method: "DELETE",
          token: accessToken,
        });
        setActionMessage("Saved user removed.");
        showToast({ title: "Saved user removed", variant: "success" });
      } else {
        await apiFetch("/saved/users", {
          method: "POST",
          token: accessToken,
          body: JSON.stringify({ targetUserId }),
        });
        setActionMessage("User saved to favorites.");
        showToast({ title: "User saved", description: "You can find them again in Favorites.", variant: "success" });
      }

      setSavedRefreshKey((value) => value + 1);
    } catch (saveError) {
      setActionMessage(saveError instanceof Error ? saveError.message : "Unable to update saved user.");
      showToast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Unable to update saved user.",
        variant: "error",
      });
    }
  }

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleConnectionUpdate = (_connection: ConnectionItem) => {
      setRefreshKey((value) => value + 1);
    };

    socket.on("connection:update", handleConnectionUpdate);

    return () => {
      socket.off("connection:update", handleConnectionUpdate);
    };
  }, [socket]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Partner Finder</span>
        <h1 className="text-3xl font-semibold tracking-tight">
          People in your target city who fit your budget and vibe
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          FlatBuddy ranks these matches using city, rent overlap, area preference, food habits, and shared interests.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {hasTenantPro ? "Tenant Pro is active" : "Free tenant plan"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasTenantPro
                ? "Advanced match filters and compatibility insights are unlocked for your account."
                : `You can keep up to ${FREE_TENANT_PENDING_REQUEST_LIMIT} pending partner requests at a time.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={hasTenantPro ? "success" : "outline"}>
              {pendingSentCount}/{hasTenantPro ? "Unlimited" : FREE_TENANT_PENDING_REQUEST_LIMIT} pending
            </Badge>
            {!hasTenantPro ? (
              <Link className={buttonVariants({ variant: "outline" })} to="/pricing">
                Upgrade
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visible matches</p>
              <p className="text-2xl font-semibold">{filteredMatches.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">80%+ compatible</p>
              <p className="text-2xl font-semibold">{highCompatibilityCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saved / connected</p>
              <p className="text-2xl font-semibold">
                {savedUsers.length} / {acceptedConnectionsCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 lg:grid-cols-[1.1fr_220px_220px_1fr_220px]">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Search matches
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, area, city, or interest"
              />
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Minimum compatibility
            <select
              value={minCompatibility}
              onChange={(event) => setMinCompatibility(Number(event.target.value))}
              disabled={!hasTenantPro}
              className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted"
            >
              {compatibilityOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 0 ? "Any score" : `${value}% and above`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Occupation filter
            <select
              value={occupation}
              onChange={(event) => setOccupation(event.target.value as OccupationType | "")}
              disabled={!hasTenantPro}
              className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-muted"
            >
              {occupationOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Interest keyword
            <Input
              value={interest}
              onChange={(event) => setInterest(event.target.value)}
              disabled={!hasTenantPro}
              placeholder={hasTenantPro ? "gym, music, cooking..." : "Unlock with Tenant Pro"}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="compatibility">Highest compatibility</option>
              <option value="budget">Lowest budget first</option>
              <option value="city">City name</option>
            </select>
          </label>
        </CardContent>
      </Card>

      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading partner matches...</p> : null}
      {!isLoading && filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="font-semibold">No matches fit the current filters.</p>
            <p className="text-sm text-muted-foreground">
              Try clearing the search or widening the compatibility and occupation filters.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {filteredMatches.map((match) => {
          const existingConnection = connectionLookup.get(match.user.id);
          const visibleInterests = (match.user.preference?.interests ?? []).slice(0, 3);

          return (
            <Card key={match.user.id}>
              <CardHeader>
                <CardTitle>{match.user.profile?.fullName ?? match.user.email}</CardTitle>
                <CardDescription>
                  {formatLabel(match.user.profile?.occupation ?? "OTHER")} |{" "}
                  {match.user.profile?.targetCity?.name ?? "Target city not set"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="success">{match.compatibilityScore}% compatibility</Badge>
                  <Badge variant="outline">
                    Rs. {match.user.profile?.budgetMin ?? 0} - Rs. {match.user.profile?.budgetMax ?? 0}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {match.user.profile?.bio ?? "No bio added yet."}
                </p>
                <div className="grid gap-2 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground md:grid-cols-2">
                  <div>
                    <p className="font-medium text-foreground">Preferred area</p>
                    <p>{match.user.profile?.preferredArea ?? "Flexible area search"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Move-in timing</p>
                    <p>
                      {match.user.profile?.moveInDate
                        ? new Date(match.user.profile.moveInDate).toLocaleDateString("en-IN")
                        : "Still deciding"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleInterests.map((matchInterest) => (
                    <Badge key={matchInterest} variant="outline">
                      {matchInterest}
                    </Badge>
                  ))}
                  {(match.user.preference?.interests?.length ?? 0) > visibleInterests.length ? (
                    <Badge variant="outline">
                      +{(match.user.preference?.interests?.length ?? 0) - visibleInterests.length} more
                    </Badge>
                  ) : null}
                </div>
                {hasTenantPro && match.insights?.length ? (
                  <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                    <p className="mb-2 font-medium text-foreground">Compatibility insights</p>
                    <div className="flex flex-wrap gap-2">
                      {match.insights.map((insight) => (
                        <Badge key={`${match.user.id}-${insight}`} variant="outline">
                          {insight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {!existingConnection ? (
                    <Button
                      disabled={pendingUserId === match.user.id || reachedFreeRequestLimit}
                      onClick={() => void handleConnect(match.user.id, match.user.profile?.targetCityId)}
                    >
                      {reachedFreeRequestLimit
                        ? "Upgrade to send more"
                        : pendingUserId === match.user.id
                          ? "Sending..."
                          : "Send request"}
                    </Button>
                  ) : existingConnection.status === "ACCEPTED" ? (
                    <Link className={buttonVariants()} to="/inbox">
                      Open chat
                    </Link>
                  ) : (
                    <Badge variant="outline">
                      {existingConnection.isReceiver ? "Request received" : "Request pending"}
                    </Badge>
                  )}
                  <Link className={buttonVariants({ variant: "outline" })} to="/properties">
                    Explore listings
                  </Link>
                  <Link className={buttonVariants({ variant: "outline" })} to={`/partners/${match.user.id}`}>
                    View profile
                  </Link>
                  <Button onClick={() => void handleSaveUser(match.user.id)} variant="outline">
                    {savedUserIds.has(match.user.id) ? "Saved" : "Save user"}
                  </Button>
                  {existingConnection?.status === "ACCEPTED" ? (
                    <Link className={buttonVariants({ variant: "outline" })} to="/groups">
                      Add to group
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
