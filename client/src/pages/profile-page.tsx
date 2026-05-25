import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Circle, ShieldCheck, TrendingUp, UserRound, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useCities } from "@/hooks/use-cities";
import { useAdminOverview } from "@/hooks/use-admin";
import { useLandlordAnalytics } from "@/hooks/use-landlord-analytics";
import { useMatches } from "@/hooks/use-matches";
import { useProperties } from "@/hooks/use-properties";
import { apiFetch } from "@/lib/api";
import { hasActivePlan } from "@/lib/subscription";
import type {
  AuthUser,
  AdminOverview,
  City,
  DrinkingPreference,
  FoodPreference,
  LandlordAnalytics,
  MatchItem,
  OccupationType,
  PropertyItem,
  SmokingPreference,
} from "@/lib/types";

const occupationOptions: OccupationType[] = ["STUDENT", "WORKING_PROFESSIONAL", "FREELANCER", "OTHER"];
const foodOptions: FoodPreference[] = ["VEGETARIAN", "NON_VEGETARIAN", "EGGETARIAN", "FLEXIBLE"];
const smokingOptions: SmokingPreference[] = ["NO", "OCCASIONAL", "YES", "FLEXIBLE"];
const drinkingOptions: DrinkingPreference[] = ["NO", "OCCASIONAL", "YES", "FLEXIBLE"];

export function ProfilePage() {
  const { user, accessToken, refreshUser } = useAuth();
  const { cities } = useCities();
  const isAdminView = user?.role === "ADMIN";
  const isLandlordView = user?.role === "LANDLORD";
  const { matches, isLoading: matchesLoading, error: matchesError } = useMatches(
    isLandlordView || isAdminView ? null : accessToken,
  );
  const { properties } = useProperties({ mine: true, token: isLandlordView ? accessToken : null });
  const { overview: adminOverview, isLoading: adminOverviewLoading, error: adminOverviewError } = useAdminOverview(
    isAdminView ? accessToken : null,
  );
  const hasTenantPro = user?.role === "ADMIN" || hasActivePlan(user, "TENANT_PRO");
  const hasLandlordPro = user?.role === "ADMIN" || hasActivePlan(user, "LANDLORD_PRO");
  const { analytics, isLoading: analyticsLoading, error: analyticsError } = useLandlordAnalytics(
    isLandlordView && hasLandlordPro ? accessToken : null,
  );

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [fullName, setFullName] = useState("");
  const [occupation, setOccupation] = useState<OccupationType>("WORKING_PROFESSIONAL");
  const [currentCity, setCurrentCity] = useState("");
  const [targetCityId, setTargetCityId] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [collegeOrCompany, setCollegeOrCompany] = useState("");
  const [foodPreference, setFoodPreference] = useState<FoodPreference>("FLEXIBLE");
  const [smokingPreference, setSmokingPreference] = useState<SmokingPreference>("FLEXIBLE");
  const [drinkingPreference, setDrinkingPreference] = useState<DrinkingPreference>("FLEXIBLE");
  const [cleanlinessLevel, setCleanlinessLevel] = useState("3");
  const [sleepSchedule, setSleepSchedule] = useState("");
  const [petsFriendly, setPetsFriendly] = useState(false);
  const [languagePreferences, setLanguagePreferences] = useState("");
  const [interests, setInterests] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    const nextProfile = hydrateProfileState(user);
    const nextPreference = hydratePreferenceState(user);

    setFullName(nextProfile.fullName);
    setOccupation(nextProfile.occupation);
    setCurrentCity(nextProfile.currentCity);
    setTargetCityId(nextProfile.targetCityId);
    setPreferredArea(nextProfile.preferredArea);
    setBudgetMin(nextProfile.budgetMin);
    setBudgetMax(nextProfile.budgetMax);
    setMoveInDate(nextProfile.moveInDate);
    setBio(nextProfile.bio);
    setPhone(nextProfile.phone);
    setCollegeOrCompany(nextProfile.collegeOrCompany);
    setFoodPreference(nextPreference.foodPreference);
    setSmokingPreference(nextPreference.smokingPreference);
    setDrinkingPreference(nextPreference.drinkingPreference);
    setCleanlinessLevel(nextPreference.cleanlinessLevel);
    setSleepSchedule(nextPreference.sleepSchedule);
    setPetsFriendly(nextPreference.petsFriendly);
    setLanguagePreferences(nextPreference.languagePreferences);
    setInterests(nextPreference.interests);
  }, [user]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to build your FlatBuddy profile</CardTitle>
          <CardDescription>
            Your city choices, trust signals, and saved details help FlatBuddy personalize the workspace around you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleProfileSave() {
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      await apiFetch("/profile", {
        method: "PUT",
        token: accessToken,
        body: JSON.stringify({
          fullName,
          occupation,
          collegeOrCompany,
          phone,
          currentCity,
          targetCityId: targetCityId || undefined,
          preferredArea,
          budgetMin: !isLandlordView && !isAdminView && budgetMin ? Number(budgetMin) : undefined,
          budgetMax: !isLandlordView && !isAdminView && budgetMax ? Number(budgetMax) : undefined,
          moveInDate: !isLandlordView && !isAdminView && moveInDate ? moveInDate : undefined,
          bio,
        }),
      });
      await refreshUser();
      setProfileMessage(
        isAdminView ? "Admin profile saved successfully." : isLandlordView ? "Landlord profile saved successfully." : "Profile saved successfully.",
      );
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePreferenceSave() {
    setIsSavingPreference(true);
    setPreferenceMessage(null);

    try {
      await apiFetch("/profile/preferences", {
        method: "PUT",
        token: accessToken,
        body: JSON.stringify({
          foodPreference,
          smokingPreference,
          drinkingPreference,
          cleanlinessLevel: Number(cleanlinessLevel),
          sleepSchedule,
          petsFriendly,
          languagePreferences: splitCsv(languagePreferences),
          interests: splitCsv(interests),
        }),
      });
      await refreshUser();
      setPreferenceMessage("Preferences saved successfully.");
    } catch (error) {
      setPreferenceMessage(error instanceof Error ? error.message : "Unable to save preferences.");
    } finally {
      setIsSavingPreference(false);
    }
  }

  const targetCityName = cities.find((city) => city.id === targetCityId)?.name ?? "Select city";
  const averageCompatibility =
    matches.length > 0
      ? Math.round(matches.reduce((total, match) => total + match.compatibilityScore, 0) / matches.length)
      : 0;
  const highFitMatches = matches.filter((match) => match.compatibilityScore >= 80).length;
  const commonInterestMap = new Map<string, number>();

  matches.forEach((match) => {
    (match.user.preference?.interests ?? []).forEach((interest) => {
      commonInterestMap.set(interest, (commonInterestMap.get(interest) ?? 0) + 1);
    });
  });

  const commonInterests = [...commonInterestMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([interest]) => interest);

  if (isLandlordView) {
    const liveListings = properties.filter((property) => property.status === "ACTIVE" || property.status === "PAUSED");
    const latestListings = properties.slice(0, 3);

    return (
      <LandlordProfileView
        analytics={analytics}
        analyticsError={analyticsError}
        analyticsLoading={analyticsLoading}
        bio={bio}
        cities={cities}
        collegeOrCompany={collegeOrCompany}
        currentCity={currentCity}
        fullName={fullName}
        hasLandlordPro={hasLandlordPro}
        isSavingProfile={isSavingProfile}
        latestListings={latestListings}
        liveListings={liveListings.length}
        onSave={() => void handleProfileSave()}
        phone={phone}
        preferredArea={preferredArea}
        profileMessage={profileMessage}
        setBio={setBio}
        setCollegeOrCompany={setCollegeOrCompany}
        setCurrentCity={setCurrentCity}
        setFullName={setFullName}
        setPhone={setPhone}
        setPreferredArea={setPreferredArea}
        setTargetCityId={setTargetCityId}
        targetCityId={targetCityId}
        targetCityName={targetCityName}
        user={user}
      />
    );
  }

  if (isAdminView) {
    return (
      <AdminProfileView
        adminOverview={adminOverview}
        adminOverviewError={adminOverviewError}
        adminOverviewLoading={adminOverviewLoading}
        bio={bio}
        currentCity={currentCity}
        fullName={fullName}
        isSavingProfile={isSavingProfile}
        onSave={() => void handleProfileSave()}
        phone={phone}
        profileMessage={profileMessage}
        setBio={setBio}
        setCurrentCity={setCurrentCity}
        setFullName={setFullName}
        setPhone={setPhone}
        user={user}
      />
    );
  }

  return (
    <TenantProfileView
      averageCompatibility={averageCompatibility}
      bio={bio}
      budgetMax={budgetMax}
      budgetMin={budgetMin}
      cities={cities}
      cleanlinessLevel={cleanlinessLevel}
      commonInterests={commonInterests}
      currentCity={currentCity}
      drinkingPreference={drinkingPreference}
      foodPreference={foodPreference}
      fullName={fullName}
      hasTenantPro={hasTenantPro}
      highFitMatches={highFitMatches}
      interests={interests}
      isSavingPreference={isSavingPreference}
      isSavingProfile={isSavingProfile}
      languagePreferences={languagePreferences}
      matches={matches}
      matchesError={matchesError}
      matchesLoading={matchesLoading}
      moveInDate={moveInDate}
      occupation={occupation}
      onSavePreferences={() => void handlePreferenceSave()}
      onSaveProfile={() => void handleProfileSave()}
      petsFriendly={petsFriendly}
      preferenceMessage={preferenceMessage}
      preferredArea={preferredArea}
      profileMessage={profileMessage}
      setBio={setBio}
      setBudgetMax={setBudgetMax}
      setBudgetMin={setBudgetMin}
      setCleanlinessLevel={setCleanlinessLevel}
      setCurrentCity={setCurrentCity}
      setDrinkingPreference={setDrinkingPreference}
      setFoodPreference={setFoodPreference}
      setFullName={setFullName}
      setInterests={setInterests}
      setLanguagePreferences={setLanguagePreferences}
      setMoveInDate={setMoveInDate}
      setOccupation={setOccupation}
      setPetsFriendly={setPetsFriendly}
      setPreferredArea={setPreferredArea}
      setSleepSchedule={setSleepSchedule}
      setSmokingPreference={setSmokingPreference}
      setTargetCityId={setTargetCityId}
      sleepSchedule={sleepSchedule}
      smokingPreference={smokingPreference}
      targetCityId={targetCityId}
      targetCityName={targetCityName}
      user={user}
    />
  );
}

type LandlordProfileViewProps = {
  analytics: LandlordAnalytics | null;
  analyticsError: string | null;
  analyticsLoading: boolean;
  bio: string;
  cities: City[];
  collegeOrCompany: string;
  currentCity: string;
  fullName: string;
  hasLandlordPro: boolean;
  isSavingProfile: boolean;
  latestListings: PropertyItem[];
  liveListings: number;
  onSave: () => void;
  phone: string;
  preferredArea: string;
  profileMessage: string | null;
  setBio: (value: string) => void;
  setCollegeOrCompany: (value: string) => void;
  setCurrentCity: (value: string) => void;
  setFullName: (value: string) => void;
  setPhone: (value: string) => void;
  setPreferredArea: (value: string) => void;
  setTargetCityId: (value: string) => void;
  targetCityId: string;
  targetCityName: string;
  user: AuthUser;
};

function LandlordProfileView({
  analytics,
  analyticsError,
  analyticsLoading,
  bio,
  cities,
  collegeOrCompany,
  currentCity,
  fullName,
  hasLandlordPro,
  isSavingProfile,
  latestListings,
  liveListings,
  onSave,
  phone,
  preferredArea,
  profileMessage,
  setBio,
  setCollegeOrCompany,
  setCurrentCity,
  setFullName,
  setPhone,
  setPreferredArea,
  setTargetCityId,
  targetCityId,
  targetCityName,
  user,
}: LandlordProfileViewProps) {
  const hasManagedAreas = Boolean(preferredArea.trim());
  const hasContactNumber = Boolean(phone.trim());
  const hasPublishedListing = liveListings > 0;
  const isLandlordProfileReady = Boolean(fullName.trim() && targetCityId && hasManagedAreas && hasContactNumber);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <Card>
        <CardHeader>
          <CardTitle>Your landlord profile</CardTitle>
          <CardDescription>
            This profile helps tenant groups understand who manages the listing, where you operate, and how trusted your account is.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              fallback={getInitials(fullName || user.email)}
              alt={fullName || user.email}
              src={user.profile?.avatarUrl ?? undefined}
              className="size-16"
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{fullName || user.email}</p>
                <Badge variant={isLandlordProfileReady ? "success" : "outline"}>
                  {isLandlordProfileReady ? "Profile complete" : "Needs setup"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {collegeOrCompany || "Independent landlord"} · {targetCityName}
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              {
                done: hasManagedAreas,
                label: hasManagedAreas ? `Operating areas: ${preferredArea}` : "Add the areas you actively manage",
              },
              {
                done: hasContactNumber,
                label: hasContactNumber ? `Contact number saved: ${phone}` : "Save a contact number for faster coordination",
              },
              {
                done: hasPublishedListing,
                label: hasPublishedListing
                  ? `${liveListings} live listing(s) ready for tenant groups`
                  : "Publish your first listing from the landlord workspace",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
                {item.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                {item.label}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-primary" />
              <p className="font-medium">Verification status</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={user.landlordVerificationStatus === "APPROVED" ? "success" : "outline"}>
                {formatLabel(user.landlordVerificationStatus ?? "NOT_REQUESTED")}
              </Badge>
              {user.landlordVerifiedAt ? (
                <span className="text-sm text-muted-foreground">
                  Approved on {new Date(user.landlordVerifiedAt).toLocaleDateString("en-IN")}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep this updated so tenant groups can trust your listings faster and admins can review your account cleanly.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <Building2 className="size-4 text-primary" />
              <p className="font-medium">Workspace shortcuts</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} to="/landlord">
                Open landlord workspace
              </Link>
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} to="/properties">
                View live feed
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business profile details</CardTitle>
            <CardDescription>
              These values help FlatBuddy present you as a verified, contactable landlord instead of a tenant matcher.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Full name
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Business / brand name
                <Input
                  value={collegeOrCompany}
                  onChange={(event) => setCollegeOrCompany(event.target.value)}
                  placeholder="Independent landlord or agency name"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Contact number
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98..." />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Primary listing city
                <select
                  value={targetCityId}
                  onChange={(event) => setTargetCityId(event.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select primary city</option>
                  {cities.map((city) => (
                    <option key={city.id ?? city.slug} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Current base city
                <Input value={currentCity} onChange={(event) => setCurrentCity(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Preferred micro-markets
                <Input
                  value={preferredArea}
                  onChange={(event) => setPreferredArea(event.target.value)}
                  placeholder="Viman Nagar, Hinjewadi"
                />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Short landlord bio
              <Textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell tenants what kind of homes you manage and what experience they can expect."
              />
            </label>
            {profileMessage ? <p className="text-sm text-muted-foreground">{profileMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSavingProfile} onClick={onSave}>
                <UserRound className="size-4" />
                {isSavingProfile ? "Saving profile..." : "Save landlord profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Landlord snapshot</CardTitle>
            <CardDescription>A quick health check for listings, trust, and premium analytics.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total listings", value: latestListings.length, icon: Building2 },
                { label: "Live listings", value: liveListings, icon: TrendingUp },
                { label: "Verification", value: formatLabel(user.landlordVerificationStatus ?? "NOT_REQUESTED"), icon: ShieldCheck },
                { label: "Plan", value: hasLandlordPro ? "Landlord Pro" : "Free", icon: UserRound },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-white p-4">
                  <item.icon className="size-4 text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
            {!hasLandlordPro ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                Upgrade to Landlord Pro if you want analytics, listing performance data, and better discovery priority.
              </div>
            ) : null}
            {analyticsError ? <p className="text-sm text-muted-foreground">{analyticsError}</p> : null}
            {analyticsLoading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : null}
            {hasLandlordPro && analytics ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Total saves", value: analytics.summary.totalSaves },
                  { label: "Visit requests", value: analytics.summary.totalVisits },
                  { label: "Average rent", value: `Rs. ${analytics.summary.averageRent.toLocaleString("en-IN")}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent listings</CardTitle>
            <CardDescription>This keeps the profile grounded in real inventory instead of tenant-match widgets.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {latestListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No listings yet. Use the landlord workspace to publish your first property.
              </p>
            ) : null}
            {latestListings.map((property) => (
              <div key={property.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{property.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.city.name} · {property.areaName}
                    </p>
                  </div>
                  <Badge variant="outline">{property.status.toLowerCase()}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">Rs. {property.monthlyRent.toLocaleString("en-IN")}</Badge>
                  <Badge variant="outline">{formatLabel(property.propertyType)}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type AdminProfileViewProps = {
  adminOverview: AdminOverview | null;
  adminOverviewError: string | null;
  adminOverviewLoading: boolean;
  bio: string;
  currentCity: string;
  fullName: string;
  isSavingProfile: boolean;
  onSave: () => void;
  phone: string;
  profileMessage: string | null;
  setBio: (value: string) => void;
  setCurrentCity: (value: string) => void;
  setFullName: (value: string) => void;
  setPhone: (value: string) => void;
  user: AuthUser;
};

function AdminProfileView({
  adminOverview,
  adminOverviewError,
  adminOverviewLoading,
  bio,
  currentCity,
  fullName,
  isSavingProfile,
  onSave,
  phone,
  profileMessage,
  setBio,
  setCurrentCity,
  setFullName,
  setPhone,
  user,
}: AdminProfileViewProps) {
  const overviewCards = [
    { label: "Platform users", value: String(adminOverview?.users ?? 0) },
    { label: "Open reports", value: String(adminOverview?.openReports ?? 0) },
    { label: "Active listings", value: String(adminOverview?.activeListings ?? 0) },
    { label: "Verification queue", value: String(adminOverview?.pendingVerificationRequests ?? 0) },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
      <Card>
        <CardHeader>
          <CardTitle>Your admin profile</CardTitle>
          <CardDescription>
            Keep your account details current so the ops workspace stays clear, accountable, and easy to hand off.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              fallback={getInitials(fullName || user.email)}
              alt={fullName || user.email}
              src={user.profile?.avatarUrl ?? undefined}
              className="size-16"
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{fullName || user.email}</p>
                <Badge variant="success">Admin</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Platform ops account · {currentCity || "Add your base city"}
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              phone ? `Contact number saved: ${phone}` : "Save a contact number for urgent moderation handoffs",
              currentCity ? `Current base city: ${currentCity}` : "Add your current city for team context",
              bio ? "Admin bio is available for internal context" : "Add a short ops bio for accountability",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
                <CheckCircle2 className="size-4 text-success" />
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-primary" />
              <p className="font-medium">Admin role status</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Admin accounts bypass premium gating and should focus on moderation, verification, and platform health instead of renter matching.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} to="/admin">
                Open admin console
              </Link>
              <Link className={buttonVariants({ variant: "outline", size: "sm" })} to="/properties">
                Review marketplace feed
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin account details</CardTitle>
            <CardDescription>
              Keep the admin account profile lean and operational instead of using renter or landlord settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Full name
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Contact number
                <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98..." />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium md:col-span-2">
                Current city
                <Input value={currentCity} onChange={(event) => setCurrentCity(event.target.value)} placeholder="Ranchi, Pune, Delhi" />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Admin bio
              <Textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Describe your moderation or operations responsibilities."
              />
            </label>
            {profileMessage ? <p className="text-sm text-muted-foreground">{profileMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSavingProfile} onClick={onSave}>
                <UserRound className="size-4" />
                {isSavingProfile ? "Saving profile..." : "Save admin profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform snapshot</CardTitle>
            <CardDescription>Quick context before you jump into the admin console.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {adminOverviewError ? <p className="text-sm text-muted-foreground">{adminOverviewError}</p> : null}
            {adminOverviewLoading ? <p className="text-sm text-muted-foreground">Loading platform snapshot...</p> : null}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-border bg-white p-4">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type TenantProfileViewProps = {
  averageCompatibility: number;
  bio: string;
  budgetMax: string;
  budgetMin: string;
  cities: City[];
  cleanlinessLevel: string;
  commonInterests: string[];
  currentCity: string;
  drinkingPreference: DrinkingPreference;
  foodPreference: FoodPreference;
  fullName: string;
  hasTenantPro: boolean;
  highFitMatches: number;
  interests: string;
  isSavingPreference: boolean;
  isSavingProfile: boolean;
  languagePreferences: string;
  matches: MatchItem[];
  matchesError: string | null;
  matchesLoading: boolean;
  moveInDate: string;
  occupation: OccupationType;
  onSavePreferences: () => void;
  onSaveProfile: () => void;
  petsFriendly: boolean;
  preferenceMessage: string | null;
  preferredArea: string;
  profileMessage: string | null;
  setBio: (value: string) => void;
  setBudgetMax: (value: string) => void;
  setBudgetMin: (value: string) => void;
  setCleanlinessLevel: (value: string) => void;
  setCurrentCity: (value: string) => void;
  setDrinkingPreference: (value: DrinkingPreference) => void;
  setFoodPreference: (value: FoodPreference) => void;
  setFullName: (value: string) => void;
  setInterests: (value: string) => void;
  setLanguagePreferences: (value: string) => void;
  setMoveInDate: (value: string) => void;
  setOccupation: (value: OccupationType) => void;
  setPetsFriendly: (value: boolean) => void;
  setPreferredArea: (value: string) => void;
  setSleepSchedule: (value: string) => void;
  setSmokingPreference: (value: SmokingPreference) => void;
  setTargetCityId: (value: string) => void;
  sleepSchedule: string;
  smokingPreference: SmokingPreference;
  targetCityId: string;
  targetCityName: string;
  user: AuthUser;
};

function TenantProfileView({
  averageCompatibility,
  bio,
  budgetMax,
  budgetMin,
  cities,
  cleanlinessLevel,
  commonInterests,
  currentCity,
  drinkingPreference,
  foodPreference,
  fullName,
  hasTenantPro,
  highFitMatches,
  interests,
  isSavingPreference,
  isSavingProfile,
  languagePreferences,
  matches,
  matchesError,
  matchesLoading,
  moveInDate,
  occupation,
  onSavePreferences,
  onSaveProfile,
  petsFriendly,
  preferenceMessage,
  preferredArea,
  profileMessage,
  setBio,
  setBudgetMax,
  setBudgetMin,
  setCleanlinessLevel,
  setCurrentCity,
  setDrinkingPreference,
  setFoodPreference,
  setFullName,
  setInterests,
  setLanguagePreferences,
  setMoveInDate,
  setOccupation,
  setPetsFriendly,
  setPreferredArea,
  setSleepSchedule,
  setSmokingPreference,
  setTargetCityId,
  sleepSchedule,
  smokingPreference,
  targetCityId,
  targetCityName,
  user,
}: TenantProfileViewProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <Card>
        <CardHeader>
          <CardTitle>Your renter profile</CardTitle>
          <CardDescription>Set your renter preferences once and FlatBuddy will keep matching around them.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              fallback={getInitials(fullName || user.email)}
              alt={fullName || user.email}
              src={user.profile?.avatarUrl ?? undefined}
              className="size-16"
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{fullName || user.email}</p>
                <Badge variant="success">{user.isProfileComplete ? "Profile complete" : "Needs setup"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatLabel(occupation)} · {targetCityName}
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            {[
              budgetMin && budgetMax ? `Budget range Rs. ${budgetMin} - Rs. ${budgetMax}` : "Set your budget range",
              sleepSchedule || "Set a sleep schedule preference",
              splitCsv(interests).length > 0 ? `${splitCsv(interests).length} interest tags saved` : "Add a few interests for stronger matching",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
                <CheckCircle2 className="size-4 text-success" />
                {item}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-4 text-primary" />
              <p className="font-medium">Verification flow</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Next we can add company email, student ID, and phone verification for higher trust.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <UsersRound className="size-4 text-primary" />
              <p className="font-medium">Best match count</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {matchesLoading ? "Loading your city matches..." : `${matches.length} partner matches found`}
            </p>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} to="/matches">
              Open partner finder
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>These values shape your city feed, property fit, and partner discovery.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Full name
                <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Occupation
                <select
                  value={occupation}
                  onChange={(event) => setOccupation(event.target.value as OccupationType)}
                  className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {occupationOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Current city
                <Input value={currentCity} onChange={(event) => setCurrentCity(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Target city
                <select
                  value={targetCityId}
                  onChange={(event) => setTargetCityId(event.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select target city</option>
                  {cities.map((city) => (
                    <option key={city.id ?? city.slug} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Preferred area
                <Input value={preferredArea} onChange={(event) => setPreferredArea(event.target.value)} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Move-in date
                <Input value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} type="date" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Minimum budget
                <Input value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} type="number" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Maximum budget
                <Input value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} type="number" />
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Short bio
              <Textarea value={bio} onChange={(event) => setBio(event.target.value)} />
            </label>
            {profileMessage ? <p className="text-sm text-muted-foreground">{profileMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSavingProfile} onClick={onSaveProfile}>
                <UserRound className="size-4" />
                {isSavingProfile ? "Saving profile..." : "Save profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences and lifestyle</CardTitle>
            <CardDescription>These feed the compatibility score on the partner finder.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Food preference
                <select value={foodPreference} onChange={(event) => setFoodPreference(event.target.value as FoodPreference)} className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring">
                  {foodOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Smoking preference
                <select value={smokingPreference} onChange={(event) => setSmokingPreference(event.target.value as SmokingPreference)} className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring">
                  {smokingOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Drinking preference
                <select value={drinkingPreference} onChange={(event) => setDrinkingPreference(event.target.value as DrinkingPreference)} className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring">
                  {drinkingOptions.map((option) => (
                    <option key={option} value={option}>
                      {formatLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Cleanliness level (1-5)
                <Input value={cleanlinessLevel} onChange={(event) => setCleanlinessLevel(event.target.value)} max="5" min="1" type="number" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Sleep schedule
                <Input value={sleepSchedule} onChange={(event) => setSleepSchedule(event.target.value)} />
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-medium">
                <input checked={petsFriendly} onChange={(event) => setPetsFriendly(event.target.checked)} type="checkbox" />
                Pets friendly
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Languages
              <Input value={languagePreferences} onChange={(event) => setLanguagePreferences(event.target.value)} placeholder="English, Hindi, Tamil" />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Interests
              <Input value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="Cricket, Gym, Movie nights" />
            </label>
            <div className="flex flex-wrap gap-2">
              {splitCsv(interests).slice(0, 6).map((item) => (
                <Badge key={item} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
            {preferenceMessage ? <p className="text-sm text-muted-foreground">{preferenceMessage}</p> : null}
            <div className="flex flex-wrap gap-3">
              <Button disabled={isSavingPreference} onClick={onSavePreferences} variant="outline">
                {isSavingPreference ? "Saving preferences..." : "Save preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top tenant matches</CardTitle>
            <CardDescription>These results come from the live `/api/matches` endpoint using your saved city and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {matchesError ? <p className="text-sm text-muted-foreground">{matchesError}</p> : null}
            {!matchesLoading && matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Save your target city and preferences to unlock partner recommendations.</p>
            ) : null}
            {matches.slice(0, 3).map((match) => (
              <div key={match.user.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{match.user.profile?.fullName ?? match.user.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatLabel(match.user.profile?.occupation ?? "OTHER")} · {match.user.profile?.preferredArea ?? "Area flexible"}
                    </p>
                  </div>
                  <Badge variant="success">{match.compatibilityScore}% match</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenant Pro insights</CardTitle>
            <CardDescription>Premium tenant accounts can read their match landscape more clearly before reaching out.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!hasTenantPro ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                Upgrade to Tenant Pro to unlock richer match summaries, advanced filters, and compatibility insight signals.
              </div>
            ) : null}
            {hasTenantPro ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Average match score", value: `${averageCompatibility}%` },
                    { label: "High-fit matches", value: String(highFitMatches) },
                    { label: "Total live matches", value: String(matches.length) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-white p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-white p-4">
                  <p className="font-medium">Common themes in your best matches</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {commonInterests.length > 0 ? (
                      commonInterests.map((interest) => (
                        <Badge key={interest} variant="outline">
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add more interests and save your target city to generate better trend signals.
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function hydrateProfileState(user: AuthUser) {
  return {
    fullName: user.profile?.fullName ?? "",
    occupation: user.profile?.occupation ?? "WORKING_PROFESSIONAL",
    collegeOrCompany: user.profile?.collegeOrCompany ?? "",
    currentCity: user.profile?.currentCity ?? "",
    targetCityId: user.profile?.targetCityId ?? "",
    preferredArea: user.profile?.preferredArea ?? "",
    budgetMin: user.profile?.budgetMin?.toString() ?? "",
    budgetMax: user.profile?.budgetMax?.toString() ?? "",
    moveInDate: user.profile?.moveInDate?.slice(0, 10) ?? "",
    bio: user.profile?.bio ?? "",
    phone: user.profile?.phone ?? "",
  };
}

function hydratePreferenceState(user: AuthUser) {
  return {
    foodPreference: user.preference?.foodPreference ?? "FLEXIBLE",
    smokingPreference: user.preference?.smokingPreference ?? "FLEXIBLE",
    drinkingPreference: user.preference?.drinkingPreference ?? "FLEXIBLE",
    cleanlinessLevel: String(user.preference?.cleanlinessLevel ?? 3),
    sleepSchedule: user.preference?.sleepSchedule ?? "",
    petsFriendly: user.preference?.petsFriendly ?? false,
    languagePreferences: (user.preference?.languagePreferences ?? []).join(", "),
    interests: (user.preference?.interests ?? []).join(", "),
  };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
