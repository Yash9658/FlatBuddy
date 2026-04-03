import { Bell, Building2, CreditCard, Filter, MessageSquare, ShieldAlert, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { useNotifications } from "@/hooks/use-notifications";
import { apiFetch } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";

const notificationConfig: Record<NotificationItem["kind"], { icon: typeof Bell; tone: string }> = {
  CONNECTION: { icon: UsersRound, tone: "text-sky-600" },
  GROUP: { icon: UsersRound, tone: "text-indigo-600" },
  CHAT: { icon: MessageSquare, tone: "text-emerald-600" },
  VISIT: { icon: Building2, tone: "text-amber-600" },
  ADMIN: { icon: ShieldAlert, tone: "text-rose-600" },
  BILLING: { icon: CreditCard, tone: "text-violet-600" },
  VERIFICATION: { icon: ShieldAlert, tone: "text-primary" },
};

export function NotificationsPage() {
  const { user, accessToken } = useAuth();
  const { socket, isConnected } = useSocket();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [selectedKind, setSelectedKind] = useState<NotificationItem["kind"] | "ALL">("ALL");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { notifications, unreadCount, isLoading, error } = useNotifications(accessToken, refreshKey);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleRefresh = () => {
      setRefreshKey((value) => value + 1);
    };

    socket.on("chat:message", handleRefresh);
    socket.on("chat:list:update", handleRefresh);
    socket.on("connection:update", handleRefresh);

    return () => {
      socket.off("chat:message", handleRefresh);
      socket.off("chat:list:update", handleRefresh);
      socket.off("connection:update", handleRefresh);
    };
  }, [socket]);

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        if (selectedKind !== "ALL" && notification.kind !== selectedKind) {
          return false;
        }

        if (showUnreadOnly && !notification.isUnread) {
          return false;
        }

        return true;
      }),
    [notifications, selectedKind, showUnreadOnly],
  );

  const countsByKind = useMemo(() => {
    return notifications.reduce(
      (accumulator, notification) => {
        accumulator[notification.kind] += 1;
        return accumulator;
      },
      {
        CONNECTION: 0,
        GROUP: 0,
        CHAT: 0,
        VISIT: 0,
        ADMIN: 0,
        BILLING: 0,
        VERIFICATION: 0,
      } satisfies Record<NotificationItem["kind"], number>,
    );
  }, [notifications]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to view your notifications</CardTitle>
          <CardDescription>Your alerts, admin updates, and visit activity appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleMarkRead(notificationKey: string) {
    try {
      await apiFetch(`/notifications/${encodeURIComponent(notificationKey)}/read`, {
        method: "POST",
        token: accessToken,
      });
      setRefreshKey((value) => value + 1);
    } catch {
      // keep interaction quiet here to avoid noisy failures during navigation
    }
  }

  async function handleMarkAllRead() {
    setIsMarkingAll(true);

    try {
      await apiFetch("/notifications/read-all", {
        method: "POST",
        token: accessToken,
      });
      setRefreshKey((value) => value + 1);
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Notifications</span>
        <h1 className="text-3xl font-semibold tracking-tight">See the activity that needs your attention</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          FlatBuddy now combines partner requests, unread chats, visit updates, billing changes, and admin alerts in one feed.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Unread activity</p>
            <p className="text-sm text-muted-foreground">
              {unreadCount} items still need attention. Live socket status is {isConnected ? "connected" : "offline"}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={unreadCount > 0 ? "success" : "outline"}>{unreadCount} unread</Badge>
            <Button
              disabled={unreadCount === 0 || isMarkingAll}
              onClick={() => void handleMarkAllRead()}
              variant="outline"
            >
              {isMarkingAll ? "Updating..." : "Mark all read"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Chat alerts</p>
            <p className="mt-2 text-2xl font-semibold">{countsByKind.CHAT}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Connection updates</p>
            <p className="mt-2 text-2xl font-semibold">{countsByKind.CONNECTION}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Visits and admin</p>
            <p className="mt-2 text-2xl font-semibold">
              {countsByKind.VISIT + countsByKind.ADMIN + countsByKind.VERIFICATION}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity feed</CardTitle>
          <CardDescription>Latest cross-product updates for tenant, landlord, and admin workflows.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Filter className="size-3" />
              Feed filters
            </div>
            <select
              value={selectedKind}
              onChange={(event) => setSelectedKind(event.target.value as NotificationItem["kind"] | "ALL")}
              className="flex h-10 rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="ALL">All activity</option>
              <option value="CHAT">Chats</option>
              <option value="CONNECTION">Connections</option>
              <option value="GROUP">Groups</option>
              <option value="VISIT">Visits</option>
              <option value="ADMIN">Admin</option>
              <option value="BILLING">Billing</option>
              <option value="VERIFICATION">Verification</option>
            </select>
            <Button onClick={() => setShowUnreadOnly((value) => !value)} size="sm" variant="outline">
              {showUnreadOnly ? "Showing unread only" : "Show unread only"}
            </Button>
          </div>
          {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading notifications...</p> : null}
          {!isLoading && filteredNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active notifications right now.</p>
          ) : null}
          {filteredNotifications.map((notification) => {
            const config = notificationConfig[notification.kind];
            const Icon = config.icon;

            return (
              <Link
                key={notification.id}
                className="rounded-2xl border border-border bg-white p-4 transition hover:border-primary/40 hover:bg-primary/5"
                onClick={() => void handleMarkRead(notification.id)}
                to={notification.href}
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-2xl bg-muted/60 p-3 ${config.tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{notification.title}</p>
                      <Badge variant="outline">{notification.kind.toLowerCase()}</Badge>
                      {notification.isUnread ? <Badge variant="outline">Unread</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.description}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
