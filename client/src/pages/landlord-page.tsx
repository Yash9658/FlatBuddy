import { useEffect, useMemo, useState } from "react";
import { Activity, Building2, CalendarCheck2, HousePlus, ImagePlus, ShieldCheck, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useLandlordAnalytics } from "@/hooks/use-landlord-analytics";
import { useCities } from "@/hooks/use-cities";
import { useProperties } from "@/hooks/use-properties";
import { useVisits } from "@/hooks/use-visits";
import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/constants";
import { FREE_LANDLORD_ACTIVE_LISTING_LIMIT, hasActivePlan } from "@/lib/subscription";
import type { PropertyType, UploadResponse } from "@/lib/types";

const propertyTypes: PropertyType[] = ["PRIVATE_ROOM", "SHARED_ROOM", "STUDIO", "FULL_FLAT", "PG"];

export function LandlordPage() {
  const { user, accessToken, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { cities, error: citiesError, isLoading: citiesLoading } = useCities({ allowFallback: false });
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLandlordPro = hasActivePlan(user, "LANDLORD_PRO");
  const { properties, isLoading, error } = useProperties({
    mine: true,
    refreshKey,
    token: accessToken,
  });
  const { visits, isLoading: visitsLoading, error: visitsError } = useVisits(accessToken, refreshKey);
  const {
    analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useLandlordAnalytics(hasLandlordPro ? accessToken : null, refreshKey);
  const liveListingCount = properties.filter(
    (property) => property.status === "ACTIVE" || property.status === "PAUSED",
  ).length;
  const reachedFreeListingLimit =
    !hasLandlordPro && liveListingCount >= FREE_LANDLORD_ACTIVE_LISTING_LIMIT;

  const [cityId, setCityId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [areaName, setAreaName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("FULL_FLAT");
  const [amenities, setAmenities] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [preferredTenants, setPreferredTenants] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [visitActionId, setVisitActionId] = useState<string | null>(null);
  const [visitMessages, setVisitMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    setVerificationDocumentUrl(user?.landlordVerificationDocumentUrl ?? "");
    setVerificationNotes(user?.landlordVerificationNotes ?? "");
  }, [user?.landlordVerificationDocumentUrl, user?.landlordVerificationNotes]);

  const isAllowed = useMemo(() => user?.role === "LANDLORD", [user?.role]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login as a landlord to manage listings</CardTitle>
          <CardDescription>Landlord workspace is available after authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!isAllowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Switch to a landlord account to publish listings</CardTitle>
          <CardDescription>
            You are currently logged in as a tenant. Seeded landlord demo login: `landlord@flatbuddy.dev`.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmissionMessage(null);

    try {
      if (citiesLoading || citiesError || !cities.some((city) => city.id === cityId)) {
        throw new Error("Cities are not available right now. Refresh and try again.");
      }

      await apiFetch("/properties", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          cityId,
          title,
          description,
          propertyType,
          addressLine,
          areaName,
          monthlyRent: Number(monthlyRent),
          securityDeposit: Number(securityDeposit),
          availableFrom,
          availableBeds: 1,
          totalBeds: 2,
          furnished: true,
          amenities: splitCsv(amenities),
          houseRules: splitCsv(houseRules),
          preferredTenants: splitCsv(preferredTenants),
          images: imageUrl ? [imageUrl] : [],
        }),
      });
      setSubmissionMessage("Listing published successfully.");
      showToast({ title: "Listing published", description: "Your property is now visible in the feed.", variant: "success" });
      setRefreshKey((value) => value + 1);
      setTitle("");
      setDescription("");
      setAreaName("");
      setAddressLine("");
      setMonthlyRent("");
      setSecurityDeposit("");
      setAvailableFrom("");
      setAmenities("");
      setHouseRules("");
      setPreferredTenants("");
      setImageUrl("");
      setSelectedImage(null);
      setUploadMessage(null);
    } catch (submitError) {
      setSubmissionMessage(
        submitError instanceof Error ? submitError.message : "Unable to publish property.",
      );
      showToast({
        title: "Publish failed",
        description: submitError instanceof Error ? submitError.message : "Unable to publish property.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadImage() {
    if (!selectedImage) {
      setUploadMessage("Choose an image file first.");
      showToast({ title: "Image missing", description: "Choose an image file before uploading.", variant: "error" });
      return;
    }

    setIsUploadingImage(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await apiFetch<UploadResponse>("/uploads/image", {
        method: "POST",
        token: accessToken,
        body: formData,
      });

      setImageUrl(response.url);
      setUploadMessage("Image uploaded and attached to this listing draft.");
      showToast({ title: "Image uploaded", description: "Your draft listing now has a cover image.", variant: "success" });
    } catch (uploadError) {
      setUploadMessage(uploadError instanceof Error ? uploadError.message : "Unable to upload image.");
      showToast({
        title: "Upload failed",
        description: uploadError instanceof Error ? uploadError.message : "Unable to upload image.",
        variant: "error",
      });
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handleVisitAction(visitId: string, status: "APPROVED" | "DECLINED") {
    setVisitActionId(visitId);
    setSubmissionMessage(null);

    try {
      await apiFetch(`/visits/${visitId}`, {
        method: "PATCH",
        token: accessToken,
        body: JSON.stringify({
          status,
          landlordMessage: visitMessages[visitId] || undefined,
        }),
      });
      setSubmissionMessage(status === "APPROVED" ? "Visit request approved." : "Visit request declined.");
      showToast({
        title: status === "APPROVED" ? "Visit approved" : "Visit declined",
        description: "The tenant can see your latest decision in their property feed.",
        variant: "success",
      });
      setRefreshKey((value) => value + 1);
    } catch (visitError) {
      setSubmissionMessage(
        visitError instanceof Error ? visitError.message : "Unable to update visit request.",
      );
      showToast({
        title: "Visit update failed",
        description: visitError instanceof Error ? visitError.message : "Unable to update visit request.",
        variant: "error",
      });
    } finally {
      setVisitActionId(null);
    }
  }

  async function handleVerificationRequest() {
    setIsSubmittingVerification(true);
    setSubmissionMessage(null);

    try {
      await apiFetch("/profile/verification", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          documentUrl: verificationDocumentUrl,
          notes: verificationNotes || undefined,
        }),
      });
      await refreshUser();
      setSubmissionMessage("Verification request submitted.");
      showToast({
        title: "Verification submitted",
        description: "Your landlord verification request is now waiting for admin review.",
        variant: "success",
      });
    } catch (verificationError) {
      setSubmissionMessage(
        verificationError instanceof Error ? verificationError.message : "Unable to submit verification request.",
      );
      showToast({
        title: "Verification failed",
        description:
          verificationError instanceof Error ? verificationError.message : "Unable to submit verification request.",
        variant: "error",
      });
    } finally {
      setIsSubmittingVerification(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Landlord Workspace</span>
        <h1 className="text-3xl font-semibold tracking-tight">Help owners attract ready-made tenant groups</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          This workspace now covers listing creation, persistent cloud image uploads, and visit coordination from one place.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {hasLandlordPro ? "Landlord Pro is active" : "Free landlord plan"}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasLandlordPro
                ? "You can publish more live listings without the starter inventory cap."
                : `Free landlord accounts can keep up to ${FREE_LANDLORD_ACTIVE_LISTING_LIMIT} live listings.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={hasLandlordPro ? "success" : "outline"}>
              {liveListingCount}/{hasLandlordPro ? "Unlimited" : FREE_LANDLORD_ACTIVE_LISTING_LIMIT} live
            </Badge>
            {!hasLandlordPro ? (
              <Link className={buttonVariants({ variant: "outline" })} to="/pricing">
                Upgrade
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Landlord verification</CardTitle>
          <CardDescription>
            Verified landlords build more trust with tenant groups and support stronger conversion later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={
                user.landlordVerificationStatus === "APPROVED"
                  ? "success"
                  : user.landlordVerificationStatus === "PENDING"
                    ? "outline"
                    : "outline"
              }
            >
              {formatLabel(user.landlordVerificationStatus ?? "NOT_REQUESTED")}
            </Badge>
            {user.landlordVerifiedAt ? (
              <p className="text-sm text-muted-foreground">
                Approved on {new Date(user.landlordVerifiedAt).toLocaleDateString("en-IN")}
              </p>
            ) : null}
          </div>
          {user.landlordVerificationStatus === "APPROVED" ? (
            <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
              Your landlord account is verified. This can now be surfaced as a trust signal in future listing polish.
            </div>
          ) : (
            <>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Document URL
                <Input
                  value={verificationDocumentUrl}
                  onChange={(event) => setVerificationDocumentUrl(event.target.value)}
                  placeholder="Link to ownership proof or verification document"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Review note
                <Textarea
                  value={verificationNotes}
                  onChange={(event) => setVerificationNotes(event.target.value)}
                  placeholder="Add context for the admin reviewer"
                />
              </label>
              {user.landlordVerificationStatus === "REJECTED" && user.landlordVerificationNotes ? (
                <p className="text-sm text-muted-foreground">
                  Last review note: {user.landlordVerificationNotes}
                </p>
              ) : null}
              <Button
                disabled={!verificationDocumentUrl || isSubmittingVerification}
                onClick={() => void handleVerificationRequest()}
                variant="outline"
              >
                {isSubmittingVerification ? "Submitting..." : "Submit verification"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Landlord Pro analytics</CardTitle>
          <CardDescription>
            Premium landlords can track saves, visit demand, and listing health in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!hasLandlordPro ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
              Upgrade to Landlord Pro to unlock listing analytics, demand tracking, and performance snapshots.
            </div>
          ) : null}
          {analyticsError ? <p className="text-sm text-muted-foreground">{analyticsError}</p> : null}
          {analyticsLoading ? <p className="text-sm text-muted-foreground">Loading analytics...</p> : null}
          {hasLandlordPro && analytics ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Total saves", value: analytics.summary.totalSaves },
                  { label: "Total visits", value: analytics.summary.totalVisits },
                  { label: "Pending visits", value: analytics.summary.pendingVisits },
                  { label: "Approved visits", value: analytics.summary.approvedVisits },
                  { label: "Avg. rent", value: `Rs. ${analytics.summary.averageRent.toLocaleString("en-IN")}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border bg-white p-4">
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="size-4 text-primary" />
                      Last 7 days
                    </CardTitle>
                    <CardDescription>
                      Saves, visit demand, and approved walkthroughs across your latest week.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart timeline={analytics.timeline} />
                  </CardContent>
                </Card>
                <Card className="border border-border shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Trend breakdown</CardTitle>
                    <CardDescription>Each bar highlights where interest is building.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {analytics.timeline.map((point) => (
                      <div key={point.date} className="rounded-2xl bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">{point.label}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {point.saves + point.visitRequests + point.approvedVisits} actions
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{point.saves} saves</Badge>
                          <Badge variant="outline">{point.visitRequests} visits</Badge>
                          <Badge variant="outline">{point.approvedVisits} approved</Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4">
                {analytics.properties.slice(0, 3).map((property) => (
                  <div key={property.id} className="rounded-2xl border border-border bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{property.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.cityName} | {property.areaName}
                        </p>
                      </div>
                      <Badge variant="outline">{property.status.toLowerCase()}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{property.saves} saves</Badge>
                      <Badge variant="outline">{property.visits} visit requests</Badge>
                      <Badge variant="outline">{property.approvedVisits} approved</Badge>
                      <Badge variant="outline">{property.pendingVisits} pending</Badge>
                      <Badge variant="outline">{property.openReports} open reports</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          {
            icon: HousePlus,
            title: "Create a listing",
            description: "Capture rent, deposit, photos, amenities, and preferred tenant types.",
          },
          {
            icon: CalendarCheck2,
            title: "Manage visits",
            description: "Approve or decline tenant requests and add quick instructions.",
          },
          {
            icon: ShieldCheck,
            title: "Verification",
            description: "Admin-reviewed ownership checks can raise trust and premium conversion.",
          },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent className="flex flex-col gap-4 p-6">
              <item.icon className="size-5 text-primary" />
              <div className="flex flex-col gap-2">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create a landlord listing</CardTitle>
            <CardDescription>This form posts directly to `POST /api/properties`.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Listing title
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="3BHK near metro" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                City
                <select
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  disabled={citiesLoading || Boolean(citiesError)}
                  className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{citiesLoading ? "Loading cities..." : "Select city"}</option>
                  {cities.map((city) => (
                    <option key={city.id ?? city.slug} value={city.id ?? ""}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Area
                <Input value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="HSR Layout" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Address line
                <Input
                  value={addressLine}
                  onChange={(event) => setAddressLine(event.target.value)}
                  placeholder="Street, block, landmark"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Monthly rent
                <Input value={monthlyRent} onChange={(event) => setMonthlyRent(event.target.value)} type="number" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Security deposit
                <Input
                  value={securityDeposit}
                  onChange={(event) => setSecurityDeposit(event.target.value)}
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Available from
                <Input value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} type="date" />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Property type
                <select
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value as PropertyType)}
                  className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Description
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe who this property is ideal for, available amenities, and any key rules."
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Amenities
              <Input
                value={amenities}
                onChange={(event) => setAmenities(event.target.value)}
                placeholder="Wi-Fi, Fridge, Balcony"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              House rules
              <Input
                value={houseRules}
                onChange={(event) => setHouseRules(event.target.value)}
                placeholder="No smoking indoors, Quiet after 11 PM"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Preferred tenants
              <Input
                value={preferredTenants}
                onChange={(event) => setPreferredTenants(event.target.value)}
                placeholder="Students, Working professionals"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Cover image URL
              <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
            </label>
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                <ImagePlus className="size-4" />
                Upload listing image
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
                />
                <Button disabled={isUploadingImage} onClick={() => void handleUploadImage()} variant="outline">
                  <UploadCloud className="size-4" />
                  {isUploadingImage ? "Uploading..." : "Upload"}
                </Button>
              </div>
              {uploadMessage ? <p className="mt-3 text-sm text-muted-foreground">{uploadMessage}</p> : null}
              {imageUrl ? (
                <img
                  src={resolveAssetUrl(imageUrl)}
                  alt="Listing preview"
                  className="mt-4 h-44 w-full rounded-2xl object-cover"
                />
              ) : null}
            </div>
            {submissionMessage ? <p className="text-sm text-muted-foreground">{submissionMessage}</p> : null}
            {citiesError ? <p className="text-sm text-red-600">Unable to load cities: {citiesError}</p> : null}
            <div className="flex gap-3">
              <Button disabled={isSubmitting || reachedFreeListingLimit} onClick={() => void handleSubmit()}>
                <Building2 className="size-4" />
                {reachedFreeListingLimit
                  ? "Upgrade for more listings"
                  : isSubmitting
                    ? "Publishing..."
                    : "Publish listing"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your listings</CardTitle>
              <CardDescription>These are pulled from the live `/api/properties/mine` route.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
              {isLoading ? <p className="text-sm text-muted-foreground">Loading your listings...</p> : null}
              {properties.map((property) => (
                <div key={property.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {property.city.name} | {property.areaName}
                      </p>
                    </div>
                    <Badge>{property.status.toLowerCase()}</Badge>
                  </div>
                  {property.images[0]?.url ? (
                    <img
                      src={resolveAssetUrl(property.images[0].url)}
                      alt={property.images[0].altText ?? property.title}
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">Rs. {property.monthlyRent.toLocaleString("en-IN")}</Badge>
                    <Badge variant="outline">{formatLabel(property.propertyType)}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visit requests</CardTitle>
              <CardDescription>Approve or decline tenant viewing requests from here.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {visitsError ? <p className="text-sm text-muted-foreground">{visitsError}</p> : null}
              {visitsLoading ? <p className="text-sm text-muted-foreground">Loading visit requests...</p> : null}
              {visits.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{visit.property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {visit.requester.profile?.fullName ?? visit.requester.email} |{" "}
                        {new Date(visit.requestedDate).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <Badge variant="outline">{visit.status.toLowerCase()}</Badge>
                  </div>
                  {visit.note ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{visit.note}</p> : null}
                  <Input
                    className="mt-3"
                    value={visitMessages[visit.id] ?? visit.landlordMessage ?? ""}
                    onChange={(event) =>
                      setVisitMessages((current) => ({
                        ...current,
                        [visit.id]: event.target.value,
                      }))
                    }
                    placeholder="Optional message for the tenant"
                  />
                  <div className="mt-3 flex gap-3">
                    <Button
                      disabled={visitActionId === visit.id}
                      onClick={() => void handleVisitAction(visit.id, "APPROVED")}
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={visitActionId === visit.id}
                      onClick={() => void handleVisitAction(visit.id, "DECLINED")}
                      variant="outline"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AnalyticsChart({
  timeline,
}: {
  timeline: Array<{
    date: string;
    label: string;
    saves: number;
    visitRequests: number;
    approvedVisits: number;
  }>;
}) {
  const maxValue = Math.max(
    1,
    ...timeline.flatMap((point) => [point.saves, point.visitRequests, point.approvedVisits]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <LegendChip colorClassName="bg-sky-500" label="Saves" />
        <LegendChip colorClassName="bg-amber-500" label="Visit requests" />
        <LegendChip colorClassName="bg-emerald-500" label="Approved visits" />
      </div>
      <div className="grid grid-cols-7 gap-3">
        {timeline.map((point) => (
          <div key={point.date} className="flex flex-col items-center gap-3">
            <div className="flex h-48 w-full items-end justify-center gap-1 rounded-2xl bg-muted/40 px-2 py-3">
              {[
                { value: point.saves, colorClassName: "bg-sky-500" },
                { value: point.visitRequests, colorClassName: "bg-amber-500" },
                { value: point.approvedVisits, colorClassName: "bg-emerald-500" },
              ].map((bar, index) => (
                <div
                  key={`${point.date}-${index}`}
                  className={`w-3 rounded-full ${bar.colorClassName}`}
                  style={{
                    height: `${Math.max(10, (bar.value / maxValue) * 140)}px`,
                    opacity: bar.value === 0 ? 0.2 : 1,
                  }}
                />
              ))}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">{point.label}</p>
              <p className="text-[11px] text-muted-foreground">{point.saves + point.visitRequests + point.approvedVisits} total</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendChip({
  colorClassName,
  label,
}: {
  colorClassName: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${colorClassName}`} />
      {label}
    </div>
  );
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
