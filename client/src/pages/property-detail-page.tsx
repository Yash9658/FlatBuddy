import { useMemo, useState } from "react";
import { ExternalLink, Heart, Mail, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { PropertyMapEmbed } from "@/components/property-map-embed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { usePropertyDetail } from "@/hooks/use-property-detail";
import { useSavedProperties } from "@/hooks/use-saved";
import { useVisits } from "@/hooks/use-visits";
import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/constants";

export function PropertyDetailPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [visitsRefreshKey, setVisitsRefreshKey] = useState(0);
  const [visitDate, setVisitDate] = useState("");
  const [visitNote, setVisitNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isSubmittingVisit, setIsSubmittingVisit] = useState(false);
  const { detail, isLoading, error } = usePropertyDetail(id, accessToken, refreshKey);
  const { items: savedProperties } = useSavedProperties(accessToken, savedRefreshKey);
  const { visits } = useVisits(accessToken, visitsRefreshKey);

  const property = detail?.property;
  const relatedProperties = detail?.relatedProperties ?? [];
  const selectedImage = property?.images[selectedImageIndex] ?? property?.images[0];
  const isSaved = Boolean(property && savedProperties.some((item) => item.property.id === property.id));
  const visitStatus = property ? visits.find((visit) => visit.property.id === property.id) : undefined;

  const propertyHighlights = useMemo(() => {
    if (!property) {
      return [];
    }

    return [
      `${property.availableBeds}/${property.totalBeds} beds open`,
      property.furnished ? "Furnished setup" : "Unfurnished",
      `${property._count?.savedBy ?? 0} saves`,
      `${property._count?.visitRequests ?? 0} visit requests`,
    ];
  }, [property]);

  async function handleSaveProperty() {
    if (!property) {
      return;
    }

    if (!accessToken) {
      setMessage("Login to save this property.");
      showToast({ title: "Login required", description: "Sign in before saving a property.", variant: "error" });
      return;
    }

    try {
      if (isSaved) {
        await apiFetch(`/saved/properties/${property.id}`, {
          method: "DELETE",
          token: accessToken,
        });
        setMessage("Property removed from favorites.");
        showToast({ title: "Removed from favorites", variant: "success" });
      } else {
        await apiFetch("/saved/properties", {
          method: "POST",
          token: accessToken,
          body: JSON.stringify({ propertyId: property.id }),
        });
        setMessage("Property saved to favorites.");
        showToast({ title: "Property saved", description: "You can revisit it from Favorites.", variant: "success" });
      }

      setSavedRefreshKey((value) => value + 1);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to update saved property.");
      showToast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Unable to update saved property.",
        variant: "error",
      });
    }
  }

  async function handleVisitRequest() {
    if (!property) {
      return;
    }

    if (!accessToken) {
      setMessage("Login to request a property visit.");
      showToast({ title: "Login required", description: "Sign in before booking a visit.", variant: "error" });
      return;
    }

    if (!visitDate) {
      setMessage("Choose a visit date first.");
      showToast({ title: "Visit date missing", description: "Pick a date and time before sending the request.", variant: "error" });
      return;
    }

    setIsSubmittingVisit(true);

    try {
      await apiFetch("/visits", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          propertyId: property.id,
          requestedDate: visitDate,
          note: visitNote || undefined,
        }),
      });
      setMessage("Visit request sent to the landlord.");
      showToast({
        title: "Visit requested",
        description: "The landlord can now approve or decline this slot.",
        variant: "success",
      });
      setVisitsRefreshKey((value) => value + 1);
      setRefreshKey((value) => value + 1);
    } catch (visitError) {
      setMessage(visitError instanceof Error ? visitError.message : "Unable to request a visit.");
      showToast({
        title: "Visit request failed",
        description: visitError instanceof Error ? visitError.message : "Unable to request a visit.",
        variant: "error",
      });
    } finally {
      setIsSubmittingVisit(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading property details...</p>;
  }

  if (error || !property) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Property unavailable</CardTitle>
          <CardDescription>{error ?? "We could not load this listing right now."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/properties">
            Back to property feed
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Property Details</span>
        <h1 className="text-3xl font-semibold tracking-tight">{property.title}</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          {property.city.name} | {property.areaName} | Available from{" "}
          {new Date(property.availableFrom).toLocaleDateString("en-IN")}
        </p>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <Card>
            {selectedImage ? (
              <img
                src={resolveAssetUrl(selectedImage.url)}
                alt={selectedImage.altText ?? property.title}
                className="h-[420px] w-full rounded-t-2xl object-cover"
              />
            ) : null}
            <CardContent className="grid gap-4 p-6">
              {property.images.length > 1 ? (
                <div className="grid grid-cols-4 gap-3">
                  {property.images.map((image, index) => (
                    <button
                      key={image.id ?? `${property.id}-${index}`}
                      className={`overflow-hidden rounded-2xl border transition ${
                        selectedImageIndex === index ? "border-primary" : "border-border"
                      }`}
                      onClick={() => setSelectedImageIndex(index)}
                      type="button"
                    >
                      <img
                        src={resolveAssetUrl(image.url)}
                        alt={image.altText ?? `${property.title} ${index + 1}`}
                        className="h-24 w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Rs. {property.monthlyRent.toLocaleString("en-IN")}</Badge>
                <Badge variant="outline">{formatLabel(property.propertyType)}</Badge>
                {property.isFeatured ? <Badge variant="outline">Featured listing</Badge> : null}
              </div>
              <p className="text-sm leading-7 text-muted-foreground">{property.description}</p>
              <div className="flex flex-wrap gap-2">
                {propertyHighlights.map((highlight) => (
                  <Badge key={highlight} variant="outline">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
                <CardDescription>The home setup and livability cues landlords shared.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {property.amenities.length > 0 ? (
                  property.amenities.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No amenities listed yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>House rules</CardTitle>
                <CardDescription>What future tenants should know before moving ahead.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {property.houseRules.length > 0 ? (
                  property.houseRules.map((item) => (
                    <Badge key={item} variant="outline">
                      {item}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No house rules added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Location and access</CardTitle>
              <CardDescription>Use the map view to evaluate landmarks, commute comfort, and area fit.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
                {property.addressLine}, {property.areaName}, {property.city.name}
              </div>
              <PropertyMapEmbed
                addressLine={property.addressLine}
                areaName={property.areaName}
                cityName={property.city.name}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Next step</CardTitle>
              <CardDescription>Save this listing, request a visit, or open it directly in Maps.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button onClick={() => void handleSaveProperty()} variant="outline">
                <Heart className="size-4" />
                {isSaved ? "Saved to favorites" : "Save property"}
              </Button>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 text-sm font-semibold transition hover:bg-muted"
                href={buildMapsUrl(property)}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4" />
                Open in Maps
              </a>
              <Link className={buttonVariants({ variant: "outline" })} to="/properties">
                Back to property feed
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Book a visit</CardTitle>
              <CardDescription>Send a preferred slot and a short note to the landlord.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {visitStatus ? <Badge variant="outline">Current status: {visitStatus.status.toLowerCase()}</Badge> : null}
              <Input type="datetime-local" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} />
              <Input
                value={visitNote}
                onChange={(event) => setVisitNote(event.target.value)}
                placeholder="Example: I can visit after office hours"
              />
              {visitStatus?.landlordMessage ? (
                <p className="text-sm text-muted-foreground">Landlord note: {visitStatus.landlordMessage}</p>
              ) : null}
              <Button disabled={isSubmittingVisit} onClick={() => void handleVisitRequest()}>
                {isSubmittingVisit ? "Requesting..." : "Request visit"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Landlord snapshot</CardTitle>
              <CardDescription>Quick trust and contact context before you make a decision.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl bg-muted/40 p-4">
                <p className="font-medium">{property.owner?.profile?.fullName ?? "Verified landlord"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {property.owner?.profile?.bio ?? "Professional property owner active on FlatBuddy."}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4" />
                {property.owner?.email ?? "Email available after sign-in"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" />
                {property.isFeatured ? "Landlord Pro visibility is active on this listing." : "Standard listing visibility"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related listings</CardTitle>
              <CardDescription>Nearby or similar homes worth comparing before you decide.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {relatedProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No related properties available yet.</p>
              ) : null}
              {relatedProperties.map((item) => (
                <Link
                  key={item.id}
                  className="rounded-2xl border border-border bg-white p-4 transition hover:border-primary/40 hover:bg-primary/5"
                  to={`/properties/${item.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.city.name} | {item.areaName}
                      </p>
                    </div>
                    <Badge variant="outline">Rs. {item.monthlyRent.toLocaleString("en-IN")}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
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

function buildMapsUrl(property: { addressLine: string; areaName: string; city: { name: string } }) {
  const query = encodeURIComponent(`${property.addressLine}, ${property.areaName}, ${property.city.name}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
