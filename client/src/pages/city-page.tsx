import { Building2, Compass, MapPinned, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { CityImage } from "@/components/city-image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useCityOverview } from "@/hooks/use-city-overview";
import { resolveAssetUrl } from "@/lib/constants";

export function CityPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { city, error, isLoading } = useCityOverview(slug);

  if (!city && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>City not found</CardTitle>
          <CardDescription>We could not find this city in FlatBuddy right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/discover">
            Back to discover
          </Link>
        </CardContent>
      </Card>
    );
  }

  const activeSeekers = city?.seekers ?? [];
  const activeProperties = city?.properties ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-[2rem]">
        <CityImage
          src={city?.imageUrl}
          alt={city?.name ?? "City cover"}
          slug={city?.slug}
          className="h-72 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">
          <Badge className="mb-4 w-fit bg-white/20 text-white">{city?.state ?? "Featured city"}</Badge>
          <h1 className="text-4xl font-semibold tracking-tight">{city?.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">{city?.description}</p>
        </div>
      </section>

      {error ? <p className="text-sm text-muted-foreground">Using fallback city details: {error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading city overview...</p> : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: UsersRound,
            label: "Active seekers",
            value: String(city?._count?.profiles ?? activeSeekers.length),
          },
          {
            icon: Building2,
            label: "Live listings",
            value: String(city?._count?.properties ?? activeProperties.length),
          },
          {
            icon: Compass,
            label: "Search groups",
            value: String(city?._count?.groups ?? 0),
          },
          {
            icon: MapPinned,
            label: "Tracked areas",
            value: String(city?.areas?.length ?? 0),
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-3xl font-semibold">{item.value}</p>
              </div>
              <item.icon className="size-5 text-primary" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>People currently searching in {city?.name}</CardTitle>
            <CardDescription>
              These seekers are live from the backend city pool, so you can connect before finalizing a house.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activeSeekers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No live seekers available for this city yet.</p>
            ) : null}
            {activeSeekers.map((seeker) => (
              <div key={seeker.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{seeker.profile?.fullName ?? seeker.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {seeker.profile?.occupation ? formatLabel(seeker.profile.occupation) : "Occupation not set"} |{" "}
                      {seeker.profile?.preferredArea ?? "Area flexible"}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {seeker.profile?.budgetMin && seeker.profile?.budgetMax
                      ? `Rs. ${seeker.profile.budgetMin.toLocaleString("en-IN")} - Rs. ${seeker.profile.budgetMax.toLocaleString("en-IN")}`
                      : "Budget open"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {seeker.profile?.bio ?? "No bio shared yet."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(seeker.preference?.interests ?? []).slice(0, 4).map((interest) => (
                    <Badge key={`${seeker.id}-${interest}`} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <Link
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                    to={user ? `/partners/${seeker.id}` : "/login"}
                  >
                    {user ? "View profile" : "Login to connect"}
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular areas and rent cues</CardTitle>
            <CardDescription>Real area data helps students and professionals narrow down where to start.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {city?.areas?.map((area) => (
              <div key={area.name} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{area.name}</p>
                  <Badge>Avg Rs. {area.averageRent?.toLocaleString("en-IN") ?? "N/A"}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{area.description}</p>
              </div>
            ))}
            <Link className={buttonVariants({ variant: "outline" })} to={`/properties${slug ? `?city=${slug}` : ""}`}>
              Explore city listings
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {activeProperties.length === 0 ? (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>No live listings yet</CardTitle>
              <CardDescription>Once landlords publish active homes in this city, they will appear here automatically.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        {activeProperties.map((property) => (
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
                <CardTitle>{property.title}</CardTitle>
                {property.isFeatured ? <Badge variant="success">Featured</Badge> : null}
              </div>
              <CardDescription>
                {property.areaName} | {formatLabel(property.propertyType)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Badge className="w-fit">Rs. {property.monthlyRent.toLocaleString("en-IN")}</Badge>
              <p className="text-sm text-muted-foreground">
                Available from {new Date(property.availableFrom).toLocaleDateString("en-IN")}
              </p>
              <div className="flex flex-wrap gap-2">
                {[...property.amenities, ...property.preferredTenants].slice(0, 4).map((item) => (
                  <Badge key={`${property.id}-${item}`} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
              <Link className={buttonVariants({ variant: "outline" })} to={`/properties/${property.id}`}>
                View property
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>
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
