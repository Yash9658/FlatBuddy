import { Search, Users2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useCities } from "@/hooks/use-cities";
import { useConnections } from "@/hooks/use-connections";
import { useGroups } from "@/hooks/use-groups";
import { apiFetch } from "@/lib/api";
import type { GroupInvitationFeed, GroupInvitationItem } from "@/lib/types";

export function GroupsPage() {
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();
  const { cities, error: citiesError, isLoading: citiesLoading } = useCities({ allowFallback: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [incomingInvitations, setIncomingInvitations] = useState<GroupInvitationItem[]>([]);
  const [outgoingInvitations, setOutgoingInvitations] = useState<GroupInvitationItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(Boolean(accessToken));
  const { groups, isLoading, error } = useGroups(accessToken, refreshKey);
  const { connections } = useConnections(accessToken, refreshKey);

  const acceptedPartners = useMemo(
    () =>
      connections
        .filter((connection) => connection.status === "ACCEPTED")
        .map((connection) =>
          connection.sender.id === user?.id ? connection.receiver : connection.sender,
        ),
    [connections, user?.id],
  );

  const filteredGroups = useMemo(() => {
    const normalizedSearch = groupSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return groups;
    }

    return groups.filter((group) =>
      [group.name, group.description, group.city?.name, ...group.members.map((member) => member.user.profile?.fullName ?? member.user.email)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [groupSearch, groups]);

  const selectedMemberBudgetAverage = useMemo(() => {
    if (!user) {
      return null;
    }

    const selectedMembers = acceptedPartners.filter((partner) => selectedMemberIds.includes(partner.id));
    const allMembers = [...selectedMembers, user];
    const validBudgets = allMembers
      .map((member) => member.profile?.budgetMax ?? member.profile?.budgetMin ?? null)
      .filter((value): value is number => typeof value === "number");

    if (validBudgets.length === 0) {
      return null;
    }

    return Math.round(validBudgets.reduce((sum, value) => sum + value, 0) / validBudgets.length);
  }, [acceptedPartners, selectedMemberIds, user]);

  useEffect(() => {
    let ignore = false;

    async function loadInvitations() {
      if (!accessToken) {
        setIncomingInvitations([]);
        setOutgoingInvitations([]);
        setIsLoadingInvitations(false);
        return;
      }

      try {
        setIsLoadingInvitations(true);
        const response = await apiFetch<GroupInvitationFeed>("/groups/invitations", {
          method: "GET",
          token: accessToken,
        });

        if (!ignore) {
          setIncomingInvitations(response.incoming);
          setOutgoingInvitations(response.outgoing);
        }
      } catch {
        if (!ignore) {
          setIncomingInvitations([]);
          setOutgoingInvitations([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingInvitations(false);
        }
      }
    }

    void loadInvitations();

    return () => {
      ignore = true;
    };
  }, [accessToken, refreshKey]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to manage groups</CardTitle>
          <CardDescription>Tenant groups are only available after authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleCreateGroup() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (cityId && (citiesLoading || citiesError || !cities.some((city) => city.id === cityId))) {
        throw new Error("Cities are not available right now. Refresh and try again.");
      }

      await apiFetch("/groups", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          name,
          description,
          cityId: cityId || undefined,
          memberIds: selectedMemberIds,
        }),
      });
      setMessage(
        selectedMemberIds.length > 0 ? "Group created and join requests sent." : "Group created successfully.",
      );
      showToast({
        title: "Group created",
        description:
          selectedMemberIds.length > 0
            ? "Your group is live and partner join requests have been sent."
            : "Your search team is ready to shortlist homes together.",
        variant: "success",
      });
      setRefreshKey((value) => value + 1);
      setName("");
      setDescription("");
      setCityId("");
      setSelectedMemberIds([]);
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : "Unable to create group.");
      showToast({
        title: "Group creation failed",
        description: createError instanceof Error ? createError.message : "Unable to create group.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGroup(groupId: string, groupName: string) {
    const shouldDelete = window.confirm(
      `Delete ${groupName}? This will remove the group planner and its shortlisted homes.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await apiFetch(`/groups/${groupId}`, {
        method: "DELETE",
        token: accessToken,
      });
      setMessage("Group deleted successfully.");
      showToast({ title: "Group deleted", description: "The group planner was removed.", variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete group.");
      showToast({
        title: "Delete failed",
        description: deleteError instanceof Error ? deleteError.message : "Unable to delete group.",
        variant: "error",
      });
    }
  }

  async function handleLeaveGroup(groupId: string, groupName: string) {
    const shouldLeave = window.confirm(
      `Leave ${groupName}? You will lose access to its planner and shortlisted homes.`,
    );

    if (!shouldLeave) {
      return;
    }

    try {
      await apiFetch(`/groups/${groupId}/members/me`, {
        method: "DELETE",
        token: accessToken,
      });
      setMessage("You left the group.");
      showToast({ title: "Left group", description: "You are no longer part of that search team.", variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (leaveError) {
      setMessage(leaveError instanceof Error ? leaveError.message : "Unable to leave group.");
      showToast({
        title: "Leave failed",
        description: leaveError instanceof Error ? leaveError.message : "Unable to leave group.",
        variant: "error",
      });
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <CardTitle>Create a search group</CardTitle>
          <CardDescription>Start a group and send join requests to accepted partners before shortlisting flats together.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Accepted partners</p>
              <p className="mt-2 text-2xl font-semibold">{acceptedPartners.length}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Invites to send</p>
              <p className="mt-2 text-2xl font-semibold">{selectedMemberIds.length}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Est. team budget</p>
              <p className="mt-2 text-2xl font-semibold">
                {selectedMemberBudgetAverage ? `Rs. ${selectedMemberBudgetAverage.toLocaleString("en-IN")}` : "NA"}
              </p>
            </div>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Group name
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="HSR Search Squad" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            City
            <select
              value={cityId}
              onChange={(event) => setCityId(event.target.value)}
              disabled={citiesLoading || Boolean(citiesError)}
              className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{citiesLoading ? "Loading cities..." : "Optional city"}</option>
              {cities.map((city) => (
                <option key={city.id ?? city.slug} value={city.id ?? ""}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Description
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What kind of home, budget, and area are you all targeting?"
            />
          </label>
          <div className="grid gap-3">
            <p className="text-sm font-medium">Invite accepted partners</p>
            {acceptedPartners.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Accept a few partner requests in Inbox first, then you can send them a group join request.
              </p>
            ) : null}
            {acceptedPartners.map((partner) => (
              <label
                key={partner.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm"
              >
                <input
                  checked={selectedMemberIds.includes(partner.id)}
                  onChange={(event) =>
                    setSelectedMemberIds((current) =>
                      event.target.checked
                        ? [...current, partner.id]
                        : current.filter((id) => id !== partner.id),
                    )
                  }
                  type="checkbox"
                />
                <span className="flex-1">{partner.profile?.fullName ?? partner.email}</span>
                <span className="text-xs text-muted-foreground">
                  Rs. {partner.profile?.budgetMin ?? 0} - Rs. {partner.profile?.budgetMax ?? 0}
                </span>
              </label>
            ))}
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {citiesError ? <p className="text-sm text-red-600">Unable to load cities: {citiesError}</p> : null}
          <Button disabled={isSubmitting || !name.trim()} onClick={() => void handleCreateGroup()}>
            {isSubmitting ? "Creating..." : "Create group"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your groups</CardTitle>
          <CardDescription>Use groups to shortlist flats, send join requests, and negotiate as a team.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Incoming join requests</p>
              <p className="mt-2 text-2xl font-semibold">{incomingInvitations.length}</p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Pending sent invites</p>
              <p className="mt-2 text-2xl font-semibold">{outgoingInvitations.length}</p>
            </div>
          </div>
          {isLoadingInvitations ? <p className="text-sm text-muted-foreground">Loading group invitations...</p> : null}
          {incomingInvitations.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium">Requests waiting on you</p>
              {incomingInvitations.map((invitation) => (
                <IncomingInvitationCard
                  key={invitation.id}
                  accessToken={accessToken}
                  invitation={invitation}
                  onResolved={() => setRefreshKey((value) => value + 1)}
                  showToast={showToast}
                />
              ))}
            </div>
          ) : null}
          {outgoingInvitations.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-sm font-medium">Pending group join requests</p>
              {outgoingInvitations.map((invitation) => (
                <div key={invitation.id} className="rounded-2xl border border-border bg-white p-4">
                  <p className="font-medium">{invitation.group.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Waiting on {invitation.invitee?.profile?.fullName ?? invitation.invitee?.email ?? "partner"} to respond.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{invitation.group.city?.name ?? "Flexible city"}</Badge>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              placeholder="Search groups by name, city, or member"
            />
          </div>
          {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading groups...</p> : null}
          {!isLoading && filteredGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups match the current search.</p>
          ) : null}
          {filteredGroups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {group.city?.name ?? "City flexible"} | {group.members.length} members
                  </p>
                </div>
                <Badge variant="outline">
                  {group.owner.id === user.id ? "You lead" : "Member"}
                </Badge>
              </div>
              {group.description ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{group.description}</p>
              ) : null}
              <div className="mt-3 grid gap-2 rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground md:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Users2 className="size-4" />
                  {group.members.length} members
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="size-4" />
                  {group.shortlists.length} shortlisted
                </div>
                <div>Updated {new Date(group.updatedAt).toLocaleDateString("en-IN")}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.members.map((member) => (
                  <Badge key={member.id} variant="outline">
                    {member.user.profile?.fullName ?? member.user.email}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{group.shortlists.length} shortlisted properties</p>
                <div className="flex flex-wrap items-center gap-2">
                  {group.owner.id === user.id ? (
                    <Button
                      onClick={() => void handleDeleteGroup(group.id, group.name)}
                      size="sm"
                      variant="outline"
                    >
                      Delete
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void handleLeaveGroup(group.id, group.name)}
                      size="sm"
                      variant="outline"
                    >
                      Leave
                    </Button>
                  )}
                  <Link className={buttonVariants({ variant: "outline", size: "sm" })} to={`/groups/${group.id}`}>
                    Open planner
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function IncomingInvitationCard({
  invitation,
  accessToken,
  onResolved,
  showToast,
}: {
  invitation: GroupInvitationItem;
  accessToken: string;
  onResolved: () => void;
  showToast: ReturnType<typeof useToast>["showToast"];
}) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleRespond(action: "ACCEPT" | "DECLINE") {
    setIsBusy(true);

    try {
      await apiFetch(`/groups/invitations/${invitation.id}/respond`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({ action }),
      });
      showToast({
        title: action === "ACCEPT" ? "Joined group" : "Invite declined",
        description:
          action === "ACCEPT"
            ? `You are now part of ${invitation.group.name}.`
            : `You declined the invite to ${invitation.group.name}.`,
        variant: "success",
      });
      onResolved();
    } catch (error) {
      showToast({
        title: "Invite update failed",
        description: error instanceof Error ? error.message : "Unable to update invitation.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="font-medium">{invitation.group.name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {invitation.inviter?.profile?.fullName ?? invitation.inviter?.email ?? "A partner"} invited you to join this group.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">{invitation.group.city?.name ?? "Flexible city"}</Badge>
        <Badge variant="outline">Pending</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={isBusy} onClick={() => void handleRespond("ACCEPT")} size="sm">
          {isBusy ? "Updating..." : "Accept"}
        </Button>
        <Button disabled={isBusy} onClick={() => void handleRespond("DECLINE")} size="sm" variant="outline">
          Decline
        </Button>
      </div>
    </div>
  );
}
