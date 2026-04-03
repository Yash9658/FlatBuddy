import { useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Building2, ShieldCheck, UserX, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useAdminOverview } from "@/hooks/use-admin";
import { apiFetch } from "@/lib/api";

export function AdminPage() {
  const { accessToken, user } = useAuth();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const { overview, reports, listings, users, isLoading, error } = useAdminOverview(accessToken, refreshKey);

  const verificationQueue = useMemo(
    () => users.filter((platformUser) => platformUser.role === "LANDLORD" && platformUser.landlordVerificationStatus === "PENDING"),
    [users],
  );
  const openReports = useMemo(() => reports.filter((report) => !report.resolved), [reports]);
  const suspendedUsers = useMemo(() => users.filter((platformUser) => platformUser.isSuspended), [users]);
  const flaggedListings = useMemo(
    () => listings.filter((listing) => listing.status === "PAUSED" || listing.status === "RENTED"),
    [listings],
  );

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login as admin to view platform controls</CardTitle>
          <CardDescription>Admin controls are only available after an account is manually promoted to ADMIN.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin role required</CardTitle>
          <CardDescription>
            This page is backed by protected admin APIs and only works for admin accounts.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const stats = overview
    ? [
        { icon: UsersRound, title: "Users", value: String(overview.users) },
        { icon: Building2, title: "Landlords", value: String(overview.landlords) },
        { icon: AlertTriangle, title: "Open reports", value: String(overview.openReports) },
        { icon: BadgeCheck, title: "Active listings", value: String(overview.activeListings) },
        { icon: UserX, title: "Suspended users", value: String(overview.suspendedUsers) },
        { icon: ShieldCheck, title: "Verification queue", value: String(overview.pendingVerificationRequests) },
      ]
    : [];

  async function handleResolveReport(reportId: string, resolved: boolean) {
    setBusyId(reportId);
    setMessage(null);

    try {
      await apiFetch(`/admin/reports/${reportId}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ resolved }),
      });
      setMessage(resolved ? "Report resolved." : "Report reopened.");
      showToast({ title: resolved ? "Report resolved" : "Report reopened", variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : "Unable to update report.");
      showToast({
        title: "Report update failed",
        description: actionError instanceof Error ? actionError.message : "Unable to update report.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleListingStatus(propertyId: string, status: "ACTIVE" | "PAUSED" | "RENTED") {
    setBusyId(propertyId);
    setMessage(null);

    try {
      await apiFetch(`/admin/listings/${propertyId}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({ status }),
      });
      setMessage(`Listing moved to ${status.toLowerCase()}.`);
      showToast({ title: "Listing updated", description: `Listing moved to ${status.toLowerCase()}.`, variant: "success" });
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : "Unable to update listing.");
      showToast({
        title: "Listing update failed",
        description: actionError instanceof Error ? actionError.message : "Unable to update listing.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUserStatus(targetUserId: string, isSuspended: boolean) {
    setBusyId(targetUserId);
    setMessage(null);

    try {
      await apiFetch(`/admin/users/${targetUserId}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({
          isSuspended,
          suspensionReason: reviewNotes[targetUserId]?.trim() || undefined,
        }),
      });
      setMessage(isSuspended ? "User suspended." : "User reactivated.");
      showToast({
        title: isSuspended ? "User suspended" : "User reactivated",
        description: isSuspended ? "Their active sessions are now revoked." : "They can sign in and use the platform again.",
        variant: "success",
      });
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      setMessage(actionError instanceof Error ? actionError.message : "Unable to update user status.");
      showToast({
        title: "User update failed",
        description: actionError instanceof Error ? actionError.message : "Unable to update user status.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleVerification(targetUserId: string, status: "APPROVED" | "REJECTED") {
    setBusyId(targetUserId);

    try {
      await apiFetch(`/admin/users/${targetUserId}/verification`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({
          status,
          notes:
            reviewNotes[targetUserId]?.trim() ||
            (status === "APPROVED" ? "Approved by admin review." : "Please upload clearer ownership proof."),
        }),
      });
      showToast({
        title: status === "APPROVED" ? "Verification approved" : "Verification rejected",
        variant: "success",
      });
      setRefreshKey((value) => value + 1);
    } catch (actionError) {
      showToast({
        title: status === "APPROVED" ? "Approval failed" : "Rejection failed",
        description: actionError instanceof Error ? actionError.message : "Unable to update verification.",
        variant: "error",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Admin Console</span>
        <h1 className="text-3xl font-semibold tracking-tight">Trust, moderation, and platform operations</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Review marketplace health, moderate risky activity, and move landlord verification decisions from one place.
        </p>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading admin dashboard...</p> : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-semibold">{stat.value}</p>
              </div>
              <stat.icon className="size-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SummaryCard
          title="Moderation focus"
          description="What needs the fastest attention right now."
          icon={AlertTriangle}
          rows={[
            { label: "Open reports", value: String(openReports.length) },
            { label: "Flagged listings", value: String(flaggedListings.length) },
            { label: "Suspended users", value: String(suspendedUsers.length) },
          ]}
        />
        <SummaryCard
          title="Trust pipeline"
          description="Verification and account integrity checkpoints."
          icon={ShieldCheck}
          rows={[
            { label: "Pending landlord reviews", value: String(verificationQueue.length) },
            { label: "Landlords on platform", value: String(overview?.landlords ?? 0) },
            { label: "Tracked cities", value: String(overview?.trackedCities ?? 0) },
          ]}
        />
        <SummaryCard
          title="Platform footprint"
          description="Quick growth and inventory context."
          icon={UsersRound}
          rows={[
            { label: "Total users", value: String(overview?.users ?? 0) },
            { label: "Active listings", value: String(overview?.activeListings ?? 0) },
            { label: "Review queue", value: String(openReports.length + verificationQueue.length) },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Moderation queue</CardTitle>
            <CardDescription>Resolve user and property reports directly from here.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports are waiting right now.</p> : null}
            {reports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{report.reason}</p>
                  <Badge variant="outline">{report.resolved ? "Resolved" : "Open"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reporter: {report.reporter.profile?.fullName ?? report.reporter.email}
                </p>
                {report.property ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Property: {report.property.title} · {report.property.city.name}
                  </p>
                ) : null}
                {report.reportedUser ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reported user: {report.reportedUser.profile?.fullName ?? report.reportedUser.email}
                  </p>
                ) : null}
                {report.details ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{report.details}</p> : null}
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Logged {new Date(report.createdAt).toLocaleString("en-IN")}
                </p>
                <div className="mt-3 flex gap-3">
                  <Button
                    disabled={busyId === report.id}
                    onClick={() => void handleResolveReport(report.id, !report.resolved)}
                    variant={report.resolved ? "outline" : "default"}
                  >
                    {report.resolved ? "Reopen" : "Resolve"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing controls</CardTitle>
            <CardDescription>Pause, restore, or close problematic listings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings are available to moderate right now.</p>
            ) : null}
            {listings.map((listing) => (
              <div key={listing.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.city.name} · {listing.areaName}
                    </p>
                  </div>
                  <Badge variant="outline">{listing.status.toLowerCase()}</Badge>
                </div>
                {listing.owner?.profile?.fullName || listing.owner?.email ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Owner: {listing.owner?.profile?.fullName ?? listing.owner?.email}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busyId === listing.id} onClick={() => void handleListingStatus(listing.id, "ACTIVE")}>
                    Restore
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === listing.id} onClick={() => void handleListingStatus(listing.id, "PAUSED")}>
                    Pause
                  </Button>
                  <Button size="sm" disabled={busyId === listing.id} onClick={() => void handleListingStatus(listing.id, "RENTED")}>
                    Mark rented
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification queue</CardTitle>
          <CardDescription>Review pending landlord identity and ownership submissions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {verificationQueue.map((platformUser) => (
            <div key={`verification-${platformUser.id}`} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{platformUser.profile?.fullName ?? platformUser.email}</p>
                  <p className="text-sm text-muted-foreground">{platformUser.email}</p>
                </div>
                <Badge variant="outline">Pending review</Badge>
              </div>
              {platformUser.landlordVerificationDocumentUrl ? (
                <a
                  className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                  href={platformUser.landlordVerificationDocumentUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open verification document
                </a>
              ) : null}
              {platformUser.landlordVerificationNotes ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{platformUser.landlordVerificationNotes}</p>
              ) : null}
              <div className="mt-3 flex gap-3">
                <Button disabled={busyId === platformUser.id} onClick={() => void handleVerification(platformUser.id, "APPROVED")}>
                  Approve
                </Button>
                <Button disabled={busyId === platformUser.id} onClick={() => void handleVerification(platformUser.id, "REJECTED")} variant="outline">
                  Reject
                </Button>
              </div>
              <Input
                className="mt-3"
                value={reviewNotes[platformUser.id] ?? platformUser.landlordVerificationNotes ?? ""}
                onChange={(event) =>
                  setReviewNotes((current) => ({
                    ...current,
                    [platformUser.id]: event.target.value,
                  }))
                }
                placeholder="Admin review note"
              />
            </div>
          ))}
          {verificationQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending landlord verification requests right now.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User moderation</CardTitle>
          <CardDescription>Suspend accounts, record a moderation reason, and reactivate them when resolved.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {users.length === 0 ? <p className="text-sm text-muted-foreground">No users are available right now.</p> : null}
          {users.map((platformUser) => (
            <div key={platformUser.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{platformUser.profile?.fullName ?? platformUser.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {platformUser.email} | {platformUser.role.toLowerCase()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{platformUser._count.reportsAgainst} reports</Badge>
                  {platformUser.subscription?.plan ? (
                    <Badge variant="outline">{platformUser.subscription.plan.toLowerCase().replace("_", " ")}</Badge>
                  ) : null}
                  {platformUser.role === "LANDLORD" ? (
                    <Badge variant="outline">{formatVerification(platformUser.landlordVerificationStatus)}</Badge>
                  ) : null}
                  <Badge
                    className={platformUser.isSuspended ? "border-rose-200 bg-rose-50 text-rose-700" : undefined}
                    variant={platformUser.isSuspended ? "outline" : "success"}
                  >
                    {platformUser.isSuspended ? "Suspended" : "Active"}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <Input
                  value={reviewNotes[platformUser.id] ?? platformUser.suspensionReason ?? ""}
                  onChange={(event) =>
                    setReviewNotes((current) => ({
                      ...current,
                      [platformUser.id]: event.target.value,
                    }))
                  }
                  placeholder="Moderation reason"
                />
                <Button disabled={busyId === platformUser.id || platformUser.role === "ADMIN"} onClick={() => void handleUserStatus(platformUser.id, true)} variant="outline">
                  Suspend
                </Button>
                <Button disabled={busyId === platformUser.id} onClick={() => void handleUserStatus(platformUser.id, false)}>
                  Reactivate
                </Button>
              </div>
              {platformUser.suspendedAt ? (
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Suspended at {new Date(platformUser.suspendedAt).toLocaleString("en-IN")}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  description,
  icon: Icon,
  rows,
}: {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="font-semibold">{row.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatVerification(value?: string | null) {
  if (!value) {
    return "not requested";
  }

  return value.toLowerCase().replace("_", " ");
}
