import {
  Bell,
  Building2,
  Compass,
  CreditCard,
  Heart,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPinned,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useSocket } from "@/context/socket-context";
import { useChats } from "@/hooks/use-chats";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function AppShell() {
  const { user, accessToken, logout, isLoading } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const { chats } = useChats(accessToken, refreshKey);
  const { unreadCount: notificationCount } = useNotifications(accessToken, refreshKey);

  useEffect(() => {
    setRefreshKey((value) => value + 1);
  }, [location.pathname]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleChatListUpdate = () => {
      setRefreshKey((value) => value + 1);
    };

    socket.on("chat:list:update", handleChatListUpdate);
    socket.on("chat:message", handleChatListUpdate);
    socket.on("connection:update", handleChatListUpdate);

    return () => {
      socket.off("chat:list:update", handleChatListUpdate);
      socket.off("chat:message", handleChatListUpdate);
      socket.off("connection:update", handleChatListUpdate);
    };
  }, [socket]);

  const unreadCount = chats.reduce((total, chat) => total + (chat.unreadCount ?? 0), 0);
  const isLandlordUser = user?.role === "LANDLORD";
  const isAdminUser = user?.role === "ADMIN";
  const navigation = [
    { to: "/", label: "Home", icon: LayoutDashboard, visible: true },
    { to: "/discover", label: "Discover Cities", icon: Compass, visible: true },
    { to: "/properties", label: "Properties", icon: MapPinned, visible: true },
    { to: "/pricing", label: "Pricing", icon: CreditCard, visible: !isAdminUser },
    { to: "/matches", label: "Partners", icon: UsersRound, visible: Boolean(user) && !isLandlordUser && !isAdminUser },
    { to: "/notifications", label: "Notifications", icon: Bell, visible: Boolean(user) },
    { to: "/inbox", label: "Inbox", icon: Inbox, visible: Boolean(user) },
    { to: "/favorites", label: "Favorites", icon: Heart, visible: Boolean(user) && !isLandlordUser && !isAdminUser },
    { to: "/groups", label: "Groups", icon: UsersRound, visible: Boolean(user) && !isLandlordUser && !isAdminUser },
    { to: "/profile", label: isAdminUser ? "Admin Profile" : isLandlordUser ? "Landlord Profile" : "Profile", icon: UserRound, visible: Boolean(user) },
    { to: "/landlord", label: "Listings", icon: Building2, visible: isLandlordUser },
    { to: "/admin", label: "Admin Console", icon: ShieldCheck, visible: isAdminUser },
  ].filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="page-shell flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
              FB
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">FlatBuddy</span>
              <span className="text-sm text-muted-foreground">
                {isAdminUser
                  ? "Platform operations for trust, moderation, and growth"
                  : isLandlordUser
                    ? "Landlord workspace for listings, visits, and trust"
                    : "Tenant partner finder for new-city moves"}
              </span>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Badge variant="success">Access + Refresh Auth</Badge>
            {user ? (
              <>
                <Badge variant="outline">{user.role.toLowerCase()}</Badge>
                <Button variant="outline" onClick={() => void logout()}>
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link className={buttonVariants()} to="/login">
                {isLoading ? "Checking session..." : "Login / Signup"}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="page-shell flex flex-col gap-8 py-8 lg:flex-row">
        <aside className="surface-blur rounded-3xl p-4 lg:sticky lg:top-8 lg:h-fit lg:w-72">
          <nav className="flex flex-col gap-2">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-white hover:text-foreground",
                    isActive && "bg-white text-foreground shadow-soft",
                  )
                }
              >
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                {to === "/inbox" && unreadCount > 0 ? <Badge>{unreadCount}</Badge> : null}
                {to === "/notifications" && notificationCount > 0 ? <Badge variant="outline">{notificationCount}</Badge> : null}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
