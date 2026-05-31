import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { GuardedRoute } from "@/components/guarded-route";

const AboutPage = lazy(() => import("@/pages/about-page").then((module) => ({ default: module.AboutPage })));
const AdminPage = lazy(() => import("@/pages/admin-page").then((module) => ({ default: module.AdminPage })));
const AuthCallbackPage = lazy(() =>
  import("@/pages/auth-callback-page").then((module) => ({ default: module.AuthCallbackPage })),
);
const BillingCancelPage = lazy(() =>
  import("@/pages/billing-cancel-page").then((module) => ({ default: module.BillingCancelPage })),
);
const BillingSuccessPage = lazy(() =>
  import("@/pages/billing-success-page").then((module) => ({ default: module.BillingSuccessPage })),
);
const CityPage = lazy(() => import("@/pages/city-page").then((module) => ({ default: module.CityPage })));
const DiscoverPage = lazy(() => import("@/pages/discover-page").then((module) => ({ default: module.DiscoverPage })));
const FavoritesPage = lazy(() =>
  import("@/pages/favorites-page").then((module) => ({ default: module.FavoritesPage })),
);
const GroupDetailPage = lazy(() =>
  import("@/pages/group-detail-page").then((module) => ({ default: module.GroupDetailPage })),
);
const GroupsPage = lazy(() => import("@/pages/groups-page").then((module) => ({ default: module.GroupsPage })));
const HomePage = lazy(() => import("@/pages/home-page").then((module) => ({ default: module.HomePage })));
const InboxPage = lazy(() => import("@/pages/inbox-page").then((module) => ({ default: module.InboxPage })));
const LandlordPage = lazy(() =>
  import("@/pages/landlord-page").then((module) => ({ default: module.LandlordPage })),
);
const LandlordSetupPage = lazy(() =>
  import("@/pages/landlord-setup-page").then((module) => ({ default: module.LandlordSetupPage })),
);
const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const MatchesPage = lazy(() => import("@/pages/matches-page").then((module) => ({ default: module.MatchesPage })));
const NotificationsPage = lazy(() =>
  import("@/pages/notifications-page").then((module) => ({ default: module.NotificationsPage })),
);
const PricingPage = lazy(() => import("@/pages/pricing-page").then((module) => ({ default: module.PricingPage })));
const ProfilePage = lazy(() => import("@/pages/profile-page").then((module) => ({ default: module.ProfilePage })));
const PropertiesPage = lazy(() =>
  import("@/pages/properties-page").then((module) => ({ default: module.PropertiesPage })),
);
const PropertyDetailPage = lazy(() =>
  import("@/pages/property-detail-page").then((module) => ({ default: module.PropertyDetailPage })),
);
const RegisterPage = lazy(() => import("@/pages/register-page").then((module) => ({ default: module.RegisterPage })));
const TenantProfilePage = lazy(() =>
  import("@/pages/tenant-profile-page").then((module) => ({ default: module.TenantProfilePage })),
);
const TenantSetupPage = lazy(() =>
  import("@/pages/tenant-setup-page").then((module) => ({ default: module.TenantSetupPage })),
);
const VerifyEmailPage = lazy(() =>
  import("@/pages/verify-email-page").then((module) => ({ default: module.VerifyEmailPage })),
);
const WelcomePage = lazy(() => import("@/pages/welcome-page").then((module) => ({ default: module.WelcomePage })));

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/discover/:slug" element={<CityPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/billing/success" element={<BillingSuccessPage />} />
          <Route path="/billing/cancel" element={<BillingCancelPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route element={<GuardedRoute />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/setup/tenant" element={<TenantSetupPage />} />
            <Route path="/setup/landlord" element={<LandlordSetupPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/partners/:id" element={<TenantProfilePage />} />
          </Route>
          <Route element={<GuardedRoute allowedRoles={["LANDLORD"]} />}>
            <Route path="/landlord" element={<LandlordPage />} />
          </Route>
          <Route element={<GuardedRoute allowedRoles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">FlatBuddy</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Loading your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pulling the next screen into place so the app stays lighter in production.
        </p>
      </div>
    </div>
  );
}
