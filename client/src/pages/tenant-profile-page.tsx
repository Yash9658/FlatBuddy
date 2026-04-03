import { useMemo, useState } from "react";
import { Briefcase, CalendarDays, HeartHandshake, MapPinned, MessageSquare, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useSavedUsers } from "@/hooks/use-saved";
import { useTenantProfileDetail } from "@/hooks/use-tenant-profile-detail";
import { apiFetch } from "@/lib/api";

export function TenantProfilePage() {
  const { id } = useParams();
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { detail, isLoading, error } = useTenantProfileDetail(id, accessToken, detailRefreshKey);
  const { items: savedUsers } = useSavedUsers(accessToken, savedRefreshKey);

  const tenant = detail?.user;
  const isSaved = Boolean(tenant && savedUsers.some((item) => item.target.id === tenant.id));
  const canRequest = !detail?.connection || detail.connection.status === "DECLINED";
  const quickFacts = useMemo(() => {
    if (!tenant) {
      return [];
    }

    return [
      tenant.profile?.occupation ? formatLabel(tenant.profile.occupation) : "Occupation not set",
      tenant.profile?.targetCity?.name ?? "Target city not set",
      tenant.profile?.preferredArea ?? "Area flexible",
      tenant.profile?.budgetMin && tenant.profile?.budgetMax
        ? `Rs. ${tenant.profile.budgetMin.toLocaleString("en-IN")} - Rs. ${tenant.profile.budgetMax.toLocaleString("en-IN")}`
        : "Budget not shared yet",
    ];
  }, [tenant]);

  async function handleSaveUser() {
    if (!tenant || !accessToken) {
      return;
    }

    try {
      if (isSaved) {
        await apiFetch(`/saved/users/${tenant.id}`, {
          method: "DELETE",
          token: accessToken,
        });
        setMessage("User removed from favorites.");
        showToast({ title: "Removed from favorites", variant: "success" });
      } else {
        await apiFetch("/saved/users", {
          method: "POST",
          token: accessToken,
          body: JSON.stringify({ targetUserId: tenant.id }),
        });
        setMessage("Tenant saved to favorites.");
        showToast({ title: "Tenant saved", description: "You can revisit them later from Favorites.", variant: "success" });
      }

      setSavedRefreshKey((value) => value + 1);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to update saved user.");
      showToast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Unable to update saved user.",
        variant: "error",
      });
    }
  }

  async function handleSendRequest() {
    if (!tenant || !accessToken) {
      return;
    }

    setIsSendingRequest(true);

    try {
      await apiFetch("/connections", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          receiverId: tenant.id,
          cityId: tenant.profile?.targetCityId ?? undefined,
          message: "Hey, your FlatBuddy profile looks like a strong fit. Want to explore options together?",
        }),
      });
      setMessage("Connection request sent.");
      showToast({ title: "Request sent", description: "They can now reply from their inbox.", variant: "success" });
      setDetailRefreshKey((value) => value + 1);
    } catch (requestError) {
      setMessage(requestError instanceof Error ? requestError.message : "Unable to send connection request.");
      showToast({
        title: "Request failed",
        description: requestError instanceof Error ? requestError.message : "Unable to send connection request.",
        variant: "error",
      });
    } finally {
      setIsSendingRequest(false);
    }
  }

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to view tenant profiles</CardTitle>
          <CardDescription>Partner profiles are available after authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading tenant profile...</p>;
  }

  if (error || !tenant) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tenant profile unavailable</CardTitle>
          <CardDescription>{error ?? "We could not load this partner profile right now."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/matches">
            Back to partner finder
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Tenant Profile</span>
        <h1 className="text-3xl font-semibold tracking-tight">{tenant.profile?.fullName ?? tenant.email}</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Dive deeper into compatibility, lifestyle, and rental-search context before you send a request.
        </p>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner snapshot</CardTitle>
              <CardDescription>High-signal details from their FlatBuddy setup.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap gap-2">
                {quickFacts.map((fact) => (
                  <Badge key={fact} variant="outline">
                    {fact}
                  </Badge>
                ))}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                {tenant.profile?.bio ?? "No bio added yet."}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow
                  icon={Briefcase}
                  label="Occupation"
                  value={tenant.profile?.occupation ? formatLabel(tenant.profile.occupation) : "Not set"}
                />
                <InfoRow
                  icon={MapPinned}
                  label="Target city"
                  value={tenant.profile?.targetCity?.name ?? "Not set"}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Move-in"
                  value={tenant.profile?.moveInDate ? new Date(tenant.profile.moveInDate).toLocaleDateString("en-IN") : "Flexible"}
                />
                <InfoRow
                  icon={HeartHandshake}
                  label="Preferred area"
                  value={tenant.profile?.preferredArea ?? "Flexible"}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shared interests</CardTitle>
                <CardDescription>The strongest conversation starters you already have.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {detail.sharedInterests.length > 0 ? (
                  detail.sharedInterests.map((interest) => (
                    <Badge key={interest} variant="outline">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No shared interests surfaced yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lifestyle tags</CardTitle>
                <CardDescription>Preferences that shape shared-living comfort.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {[
                  tenant.preference?.foodPreference ? formatLabel(tenant.preference.foodPreference) : null,
                  tenant.preference?.smokingPreference ? `${formatLabel(tenant.preference.smokingPreference)} smoking` : null,
                  tenant.preference?.drinkingPreference ? `${formatLabel(tenant.preference.drinkingPreference)} drinking` : null,
                  tenant.preference?.sleepSchedule ?? null,
                ]
                  .filter(Boolean)
                  .map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compatibility signals</CardTitle>
              <CardDescription>These are derived from the same matching logic used in FlatBuddy partner search.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard label="Compatibility" value={`${detail.compatibilityScore}%`} />
                <MetricCard label="Shared groups" value={String(detail.sharedGroups.length)} />
                <MetricCard
                  label="Move-in gap"
                  value={detail.moveInGapDays === null ? "Flexible" : `${detail.moveInGapDays} days`}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.insights.length > 0 ? (
                  detail.insights.map((insight) => (
                    <Badge key={insight} variant="outline">
                      {insight}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No additional compatibility insights available yet.</p>
                )}
              </div>
              {detail.sharedGroups.length > 0 ? (
                <div className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Shared search groups</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.sharedGroups.map((group) => (
                      <Badge key={group.id} variant="outline">
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection status</CardTitle>
              <CardDescription>See where your relationship with this tenant currently stands.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {detail.connection ? (
                <>
                  <Badge variant="outline">{detail.connection.status.toLowerCase()}</Badge>
                  <p className="text-sm text-muted-foreground">
                    {detail.connection.isIncoming
                      ? "They already sent you a request."
                      : "You already have a connection thread with this tenant."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No connection request exists yet.</p>
              )}
              <div className="grid gap-3">
                <Button disabled={!canRequest || isSendingRequest} onClick={() => void handleSendRequest()}>
                  <MessageSquare className="size-4" />
                  {!canRequest ? "Request already exists" : isSendingRequest ? "Sending..." : "Send request"}
                </Button>
                <Button onClick={() => void handleSaveUser()} variant="outline">
                  <UsersRound className="size-4" />
                  {isSaved ? "Saved to favorites" : "Save partner"}
                </Button>
                <Link className={buttonVariants({ variant: "outline" })} to="/matches">
                  Back to partner finder
                </Link>
                {detail.connection?.status === "ACCEPTED" ? (
                  <Link className={buttonVariants()} to="/inbox">
                    Open inbox
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interest cloud</CardTitle>
              <CardDescription>Use this to judge lifestyle overlap before you message.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(tenant.preference?.interests ?? []).length > 0 ? (
                (tenant.preference?.interests ?? []).map((interest) => (
                  <Badge key={interest} variant="outline">
                    {interest}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No interests added yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
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
