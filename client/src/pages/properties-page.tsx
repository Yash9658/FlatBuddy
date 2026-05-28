import { useMemo, useState } from "react";
import { ExternalLink, Filter, Heart, MapPinned, SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyMapEmbed } from "@/components/property-map-embed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useCities } from "@/hooks/use-cities";
import { useProperties } from "@/hooks/use-properties";
import { useSavedProperties } from "@/hooks/use-saved";
import { useVisits } from "@/hooks/use-visits";
import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/constants";
import type { PropertyType } from "@/lib/types";

const propertyTypes: Array<{ label: string; value: PropertyType | "" }> = [
  { label: "All types", value: "" },
  { label: "Private room", value: "PRIVATE_ROOM" },
  { label: "Shared room", value: "SHARED_ROOM" },
  { label: "Studio", value: "STUDIO" },
  { label: "Full flat", value: "FULL_FLAT" },
  { label: "PG", value: "PG" },
];

export function PropertiesPage() {
  const { accessToken } = useAuth();
  const { showToast } = useToast();
  const { cities } = useCities();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [type, setType] = useState<PropertyType | "">((searchParams.get("type") as PropertyType | "") ?? "");
  const [savedRefreshKey, setSavedRefreshKey] = useState(0);
  const [visitsRefreshKey, setVisitsRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [visitDates, setVisitDates] = useState<Record<string, string>>({});
  const [visitNotes, setVisitNotes] = useState<Record<string, string>>({});
  const [submittingVisitFor, setSubmittingVisitFor] = useState<string | null>(null);
  const { properties, isLoading, error } = useProperties({
    city: city || undefined,
    type: type || undefined,
  });
  const { items: savedProperties } = useSavedProperties(accessToken, savedRefreshKey);
  const { visits, isLoading: visitsLoading } = useVisits(accessToken, visitsRefreshKey);

  function updateSearchParams(next: { city?: string; type?: string; q?: string }) {
    const params = new URLSearchParams(searchParams);

    if (next.city !== undefined) {
      next.city ? params.set("city", next.city) : params.delete("city");
    }

    if (next.type !== undefined) {
      next.type ? params.set("type", next.type) : params.delete("type");
    }

    if (next.q !== undefined) {
      next.q ? params.set("q", next.q) : params.delete("q");
    }

    setSearchParams(params, { replace: true });
  }

  const filteredProperties = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return properties;
    }

    return properties.filter((property) =>
      [
        property.title,
        property.city?.name,
        property.areaName,
        property.addressLine,
        ...property.amenities,
        ...property.preferredTenants,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [properties, search]);

  const savedPropertyIds = useMemo(
    () => new Set(savedProperties.map((item) => item.property.id)),
    [savedProperties],
  );
  const visitLookup = useMemo(
    () => new Map(visits.map((visit) => [visit.property.id, visit])),
    [visits],
  );

  async function handleSaveProperty(propertyId: string) {
    if (!accessToken) {
      setActionMessage("Login to save properties.");
      showToast({ title: "Login required", description: "Sign in before saving properties.", variant: "error" });
      return;
    }

    setActionMessage(null);

    try {
      if (savedPropertyIds.has(propertyId)) {
        await apiFetch(`/saved/properties/${propertyId}`, {
          method: "DELETE",
          token: accessToken,
        });
        setActionMessage("Property removed from favorites.");
        showToast({ title: "Removed from favorites", variant: "success" });
      } else {
        await apiFetch("/saved/properties", {
          method: "POST",
          token: accessToken,
          body: JSON.stringify({ propertyId }),
        });
        setActionMessage("Property saved to favorites.");
        showToast({ title: "Property saved", description: "You can revisit it from Favorites.", variant: "success" });
      }

      setSavedRefreshKey((value) => value + 1);
    } catch (saveError) {
      setActionMessage(
        saveError instanceof Error ? saveError.message : "Unable to update saved property.",
      );
      showToast({
        title: "Save failed",
        description: saveError instanceof Error ? saveError.message : "Unable to update saved property.",
        variant: "error",
      });
    }
  }

  async function handleVisitRequest(propertyId: string) {
    if (!accessToken) {
      setActionMessage("Login to request a property visit.");
      showToast({ title: "Login required", description: "Sign in before booking visits.", variant: "error" });
      return;
    }

    const requestedDate = visitDates[propertyId];

    if (!requestedDate) {
      setActionMessage("Choose a visit date first.");
      showToast({ title: "Visit date missing", description: "Pick a date and time before sending the request.", variant: "error" });
      return;
    }

    setSubmittingVisitFor(propertyId);
    setActionMessage(null);

    try {
      await apiFetch("/visits", {
        method: "POST",
        token: accessToken,
        body: JSON.stringify({
          propertyId,
          requestedDate,
          note: visitNotes[propertyId] || undefined,
        }),
      });
      setActionMessage("Visit request sent to the landlord.");
      showToast({
        title: "Visit requested",
        description: "The landlord can now approve or decline this slot.",
        variant: "success",
      });
      setVisitsRefreshKey((value) => value + 1);
    } catch (visitError) {
      setActionMessage(
        visitError instanceof Error ? visitError.message : "Unable to request a visit.",
      );
      showToast({
        title: "Visit request failed",
        description: visitError instanceof Error ? visitError.message : "Unable to request a visit.",
        variant: "error",
      });
    } finally {
      setSubmittingVisitFor(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Property Feed</span>
        <h1 className="text-3xl font-semibold tracking-tight">Browse shared-living friendly listings</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          This feed now reads from the backend, so seeded or landlord-created properties show up here automatically.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 lg:grid-cols-[1fr_220px_220px]">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Search by area, landmark, or amenity
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                updateSearchParams({ q: event.target.value });
              }}
              placeholder="Search by city, area, or landmark"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <MapPinned className="size-4" />
              City
            </span>
            <select
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                updateSearchParams({ city: event.target.value });
              }}
              className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All cities</option>
              {cities.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <Filter className="size-4" />
              Property type
            </span>
            <select
              value={type}
              onChange={(event) => {
                const nextType = event.target.value as PropertyType | "";
                setType(nextType);
                updateSearchParams({ type: nextType });
              }}
              className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              {propertyTypes.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading properties...</p> : null}
      {visitsLoading ? <p className="text-sm text-muted-foreground">Loading your visit requests...</p> : null}
      {!isLoading && !error && filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-semibold text-foreground">No active properties found</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No landlord has published an active listing for these filters yet. Try another city/type, or publish a listing from a landlord account.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {filteredProperties.map((property) => (
          <Card key={property.id}>
            {property.images[0]?.url ? (
              <img
                src={resolveAssetUrl(property.images[0].url)}
                alt={property.images[0].altText ?? property.title}
                className="h-56 w-full rounded-t-2xl object-cover"
              />
            ) : null}
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>
                  <Link className="transition hover:text-primary" to={`/properties/${property.id}`}>
                    {property.title}
                  </Link>
                </CardTitle>
                {property.isFeatured ? <Badge variant="success">Featured</Badge> : null}
              </div>
              <CardDescription>
                {property.city?.name} | {property.areaName}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <Badge>Rs. {property.monthlyRent.toLocaleString("en-IN")}</Badge>
                <Badge variant="outline">{formatLabel(property.propertyType)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Available from {new Date(property.availableFrom).toLocaleDateString("en-IN")}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">{property.description}</p>
              <div className="flex flex-wrap gap-2">
                {[...property.amenities, ...property.preferredTenants].slice(0, 6).map((highlight) => (
                  <Badge key={`${property.id}-${highlight}`} variant="outline">
                    {highlight}
                  </Badge>
                ))}
              </div>
              <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                <div className="mb-2 inline-flex items-center gap-2 font-medium text-foreground">
                  <SlidersHorizontal className="size-4" />
                  House rules
                </div>
                {property.houseRules.join(", ") || "No rules added yet."}
              </div>
              <PropertyMapEmbed
                addressLine={property.addressLine}
                areaName={property.areaName}
                cityName={property.city.name}
              />
              <div className="rounded-2xl border border-border bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-medium">Visit booking</p>
                  {visitLookup.get(property.id) ? (
                    <Badge variant="outline">{visitLookup.get(property.id)?.status.toLowerCase()}</Badge>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <Input
                    type="datetime-local"
                    value={visitDates[property.id] ?? ""}
                    onChange={(event) =>
                      setVisitDates((current) => ({
                        ...current,
                        [property.id]: event.target.value,
                      }))
                    }
                  />
                  <Input
                    value={visitNotes[property.id] ?? ""}
                    onChange={(event) =>
                      setVisitNotes((current) => ({
                        ...current,
                        [property.id]: event.target.value,
                      }))
                    }
                    placeholder="Add a quick note for the landlord"
                  />
                  {visitLookup.get(property.id)?.landlordMessage ? (
                    <p className="text-sm text-muted-foreground">
                      Landlord note: {visitLookup.get(property.id)?.landlordMessage}
                    </p>
                  ) : null}
                  <Button
                    disabled={submittingVisitFor === property.id}
                    onClick={() => void handleVisitRequest(property.id)}
                  >
                    {submittingVisitFor === property.id ? "Requesting..." : "Request visit"}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => void handleSaveProperty(property.id)} variant="outline">
                  <Heart className="size-4" />
                  {savedPropertyIds.has(property.id) ? "Saved" : "Save"}
                </Button>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 text-sm font-semibold transition hover:bg-muted"
                  to={`/properties/${property.id}`}
                >
                  View details
                </Link>
              </div>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-5 text-sm font-semibold transition hover:bg-muted"
                href={buildMapsUrl(property)}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4" />
                Open in Maps
              </a>
            </CardContent>
          </Card>
        ))}
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
