import { useEffect, useMemo, useState } from "react";
import { Building2, MapPinned, NotebookPen, Trash2, UsersRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useConnections } from "@/hooks/use-connections";
import { useGroupDetail } from "@/hooks/use-groups";
import { useProperties } from "@/hooks/use-properties";
import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/constants";

export function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [planningNotes, setPlanningNotes] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [shortlistNote, setShortlistNote] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [shortlistBusyId, setShortlistBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { group, isLoading, error } = useGroupDetail(id, accessToken, refreshKey);
  const { connections } = useConnections(accessToken, refreshKey);
  const { properties } = useProperties({
    city: group?.city?.slug,
  });

  const shortlistedPropertyIds = useMemo(
    () => new Set((group?.shortlists ?? []).map((item) => item.property.id)),
    [group?.shortlists],
  );
  const availableProperties = useMemo(
    () => properties.filter((property) => !shortlistedPropertyIds.has(property.id)).slice(0, 8),
    [properties, shortlistedPropertyIds],
  );
  const isLeader = Boolean(group && user && group.owner.id === user.id);
  const inviteablePartners = useMemo(() => {
    if (!group || !user) {
      return [];
    }

    const currentMemberIds = new Set(group.members.map((member) => member.user.id));
    const pendingInviteeIds = new Set(
      (group.invitations ?? [])
        .filter((invitation) => invitation.status === "PENDING")
        .map((invitation) => invitation.invitee.id),
    );

    return connections
      .filter((connection) => connection.status === "ACCEPTED")
      .map((connection) => (connection.sender.id === user.id ? connection.receiver : connection.sender))
      .filter((partner) => !currentMemberIds.has(partner.id) && !pendingInviteeIds.has(partner.id));
  }, [connections, group, user]);

  useEffect(() => {
    if (!group) {
      return;
    }

    setDescription(group.description ?? "");
    setPlanningNotes(group.planningNotes ?? "");
  }, [group?.description, group?.planningNotes, group]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to manage group plans</CardTitle>
          <CardDescription>Group planning is available after authentication.</CardDescription>
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
    return <p className="text-sm text-muted-foreground">Loading group workspace...</p>;
  }

  if (error || !group) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group unavailable</CardTitle>
          <CardDescription>{error ?? "We could not load this group right now."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/groups">
            Back to groups
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currentGroup = group;

  async function handleSavePlan() {
    setIsSavingPlan(true);
    setMessage(null);

    try {
      await apiFetch(`/groups/${currentGroup.id}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({
          description,
          planningNotes,
        }),
      });
      setMessage("Group plan updated.");
      showToast({ title: "Plan updated", description: "Your group's planning notes are now saved.", variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to update group plan.");
      showToast({
        title: "Plan update failed",
        description: saveError instanceof Error ? saveError.message : "Unable to update group plan.",
        variant: "error",
      });
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function handleAddShortlist() {
    if (!selectedPropertyId) {
      setMessage("Select a property first.");
      return;
    }

    setShortlistBusyId(selectedPropertyId);
    setMessage(null);

    try {
      await apiFetch(`/groups/${currentGroup.id}/shortlists`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          note: shortlistNote || undefined,
        }),
      });
      setMessage("Property added to shortlist.");
      showToast({ title: "Property shortlisted", description: "Your group can now compare it together.", variant: "success" });
      setSelectedPropertyId("");
      setShortlistNote("");
      setRefreshKey((value) => value + 1);
    } catch (shortlistError) {
      setMessage(shortlistError instanceof Error ? shortlistError.message : "Unable to shortlist property.");
      showToast({
        title: "Shortlist failed",
        description: shortlistError instanceof Error ? shortlistError.message : "Unable to shortlist property.",
        variant: "error",
      });
    } finally {
      setShortlistBusyId(null);
    }
  }

  async function handleRemoveShortlist(propertyId: string) {
    setShortlistBusyId(propertyId);
    setMessage(null);

    try {
      await apiFetch(`/groups/${currentGroup.id}/shortlists/${propertyId}`, {
        method: "DELETE",
        token: accessToken,
      });
      setMessage("Property removed from shortlist.");
      showToast({ title: "Removed from shortlist", variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (removeError) {
      setMessage(removeError instanceof Error ? removeError.message : "Unable to remove shortlisted property.");
      showToast({
        title: "Remove failed",
        description: removeError instanceof Error ? removeError.message : "Unable to remove shortlisted property.",
        variant: "error",
      });
    } finally {
      setShortlistBusyId(null);
    }
  }

  async function handleInviteMember() {
    if (!selectedMemberId) {
      setMessage("Choose an accepted partner first.");
      return;
    }

    setIsInvitingMember(true);
    setMessage(null);

    try {
      await apiFetch(`/groups/${currentGroup.id}/members`, {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          inviteeUserId: selectedMemberId,
        }),
      });
      setMessage("Join request sent to partner.");
      setSelectedMemberId("");
      showToast({
        title: "Join request sent",
        description: "Your accepted connection can now accept or decline the group invite.",
        variant: "success",
      });
      setRefreshKey((value) => value + 1);
    } catch (inviteError) {
      setMessage(inviteError instanceof Error ? inviteError.message : "Unable to invite this partner.");
      showToast({
        title: "Invite failed",
        description: inviteError instanceof Error ? inviteError.message : "Unable to invite this partner.",
        variant: "error",
      });
    } finally {
      setIsInvitingMember(false);
    }
  }

  async function handleDeleteGroup() {
    const shouldDelete = window.confirm(
      `Delete ${currentGroup.name}? This will remove the group, members, and shortlisted homes from the planner.`,
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingGroup(true);
    setMessage(null);

    try {
      await apiFetch(`/groups/${currentGroup.id}`, {
        method: "DELETE",
        token: accessToken,
      });
      showToast({
        title: "Group deleted",
        description: "The planner has been removed.",
        variant: "success",
      });
      navigate("/groups");
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete this group.");
      showToast({
        title: "Delete failed",
        description: deleteError instanceof Error ? deleteError.message : "Unable to delete this group.",
        variant: "error",
      });
    } finally {
      setIsDeletingGroup(false);
    }
  }

  async function handleLeaveGroup() {
    const shouldLeave = window.confirm(
      `Leave ${currentGroup.name}? You will lose access to its planner and shortlisted homes.`,
    );

    if (!shouldLeave) {
      return;
    }

    setMessage(null);

    try {
      await apiFetch(`/groups/${currentGroup.id}/members/me`, {
        method: "DELETE",
        token: accessToken,
      });
      showToast({
        title: "Left group",
        description: "You are no longer part of that search team.",
        variant: "success",
      });
      navigate("/groups");
    } catch (leaveError) {
      setMessage(leaveError instanceof Error ? leaveError.message : "Unable to leave this group.");
      showToast({
        title: "Leave failed",
        description: leaveError instanceof Error ? leaveError.message : "Unable to leave this group.",
        variant: "error",
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Group Planner</span>
        <h1 className="text-3xl font-semibold tracking-tight">{currentGroup.name}</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Coordinate members, shortlist homes, and keep one shared plan for the group's search.
        </p>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Group setup</CardTitle>
              <CardDescription>Shared context the whole search squad can work from.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{currentGroup.city?.name ?? "City flexible"}</Badge>
                <Badge variant="outline">{currentGroup.members.length} members</Badge>
                <Badge variant="outline">{currentGroup.shortlists.length} shortlisted homes</Badge>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Group summary
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!isLeader}
                  placeholder="Shared budget, target area, and rental style"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Planning notes
                <Textarea
                  value={planningNotes}
                  onChange={(event) => setPlanningNotes(event.target.value)}
                  disabled={!isLeader}
                  placeholder="Capture landlord questions, visit schedule ideas, and top priorities."
                />
              </label>
              <div className="flex gap-3">
                <Button disabled={!isLeader || isSavingPlan} onClick={() => void handleSavePlan()}>
                  <NotebookPen className="size-4" />
                  {isSavingPlan ? "Saving..." : "Save plan"}
                </Button>
                <Link className={buttonVariants({ variant: "outline" })} to="/groups">
                  Back to groups
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shortlisted properties</CardTitle>
              <CardDescription>Homes your group is actively comparing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentGroup.shortlists.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties shortlisted yet.</p>
              ) : null}
              {currentGroup.shortlists.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.property.city.name} | {item.property.areaName}
                      </p>
                    </div>
                    <Badge variant="outline">Rs. {item.property.monthlyRent.toLocaleString("en-IN")}</Badge>
                  </div>
                  {item.property.images[0]?.url ? (
                    <img
                      src={resolveAssetUrl(item.property.images[0].url)}
                      alt={item.property.images[0].altText ?? item.property.title}
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  {item.note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.note}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      Added by {item.addedBy.profile?.fullName ?? item.addedBy.email}
                    </Badge>
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} to={`/properties/${item.property.id}`}>
                      Open listing
                    </Link>
                    <Button
                      disabled={shortlistBusyId === item.property.id}
                      onClick={() => void handleRemoveShortlist(item.property.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Everyone currently involved in this house search.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentGroup.members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{member.user.profile?.fullName ?? member.user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user.profile?.occupation ? formatLabel(member.user.profile.occupation) : "Occupation not set"}
                      </p>
                    </div>
                    <Badge variant="outline">{member.isLeader ? "Leader" : "Member"}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{member.user.profile?.preferredArea ?? "Area flexible"}</Badge>
                    {member.user.profile?.budgetMin && member.user.profile?.budgetMax ? (
                      <Badge variant="outline">
                        Rs. {member.user.profile.budgetMin.toLocaleString("en-IN")} - Rs. {member.user.profile.budgetMax.toLocaleString("en-IN")}
                      </Badge>
                    ) : null}
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} to={`/partners/${member.user.id}`}>
                      View profile
                    </Link>
                  </div>
                </div>
              ))}
              {isLeader ? (
                <div className="grid gap-3 rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm font-medium">Send a join request to an accepted partner</p>
                  <select
                    value={selectedMemberId}
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a partner</option>
                    {inviteablePartners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.profile?.fullName ?? partner.email}
                      </option>
                    ))}
                  </select>
                  {inviteablePartners.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All your accepted partners are already in this group or already have a pending invite, or you need to accept more partner requests first.
                    </p>
                  ) : null}
                  <Button disabled={isInvitingMember || !selectedMemberId} onClick={() => void handleInviteMember()}>
                    <UsersRound className="size-4" />
                    {isInvitingMember ? "Sending..." : "Send request"}
                  </Button>
                </div>
              ) : null}
              {(currentGroup.invitations ?? []).filter((invitation) => invitation.status === "PENDING").length > 0 ? (
                <div className="grid gap-3 rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm font-medium">Pending join requests</p>
                  {(currentGroup.invitations ?? [])
                    .filter((invitation) => invitation.status === "PENDING")
                    .map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{invitation.invitee.profile?.fullName ?? invitation.invitee.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Invited by {invitation.inviter.profile?.fullName ?? invitation.inviter.email}
                          </p>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                    ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add to shortlist</CardTitle>
              <CardDescription>Pull promising city-matched homes into the group workspace.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Property
                <select
                  value={selectedPropertyId}
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a property</option>
                  {availableProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {property.areaName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Quick note
                <Textarea
                  value={shortlistNote}
                  onChange={(event) => setShortlistNote(event.target.value)}
                  placeholder="Why this one looks promising for the group"
                />
              </label>
              <Button disabled={!selectedPropertyId || shortlistBusyId === selectedPropertyId} onClick={() => void handleAddShortlist()}>
                <Building2 className="size-4" />
                {shortlistBusyId === selectedPropertyId ? "Adding..." : "Add to shortlist"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search direction</CardTitle>
              <CardDescription>Shared momentum cues for the current city search.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InfoRow icon={MapPinned} label="Target city" value={currentGroup.city?.name ?? "Flexible"} />
              <InfoRow icon={UsersRound} label="Group size" value={`${currentGroup.members.length} active seekers`} />
              <InfoRow icon={Building2} label="Shortlisted homes" value={`${currentGroup.shortlists.length} properties in review`} />
            </CardContent>
          </Card>

          {!isLeader ? (
            <Card>
              <CardHeader>
                <CardTitle>Leave group</CardTitle>
                <CardDescription>Step away from this search team if your housing plans changed.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Leaving removes your access to this planner, its notes, and shortlisted homes.
                </p>
                <Button onClick={() => void handleLeaveGroup()} variant="outline">
                  Leave group
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {isLeader ? (
            <Card>
              <CardHeader>
                <CardTitle>Danger zone</CardTitle>
                <CardDescription>Delete this group if your team is no longer searching together.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Deleting a group removes its planner, member list, and shortlisted properties.
                </p>
                <Button disabled={isDeletingGroup} onClick={() => void handleDeleteGroup()} variant="outline">
                  <Trash2 className="size-4" />
                  {isDeletingGroup ? "Deleting..." : "Delete group"}
                </Button>
              </CardContent>
            </Card>
          ) : null}
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
  icon: typeof MapPinned;
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

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
