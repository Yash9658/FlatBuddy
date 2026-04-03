import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { CityImage } from "@/components/city-image";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCities } from "@/hooks/use-cities";

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { cities, error, isLoading } = useCities();

  const filteredCities = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return cities;
    }

    return cities.filter((city) =>
      [city.name, city.state, city.description, ...(city.areas?.map((area) => area.name) ?? [])]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [cities, deferredQuery]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        eyebrow="Step 1"
        title="Select the city where you want to move"
        description="This is the first product decision in FlatBuddy. Once a city is selected, the app can show active seekers, popular areas, and budget-fit listings."
      />

      <Card>
        <CardContent className="p-6">
          <label className="flex flex-col gap-3">
            <span className="text-sm font-medium text-muted-foreground">Search city or area</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try Bengaluru, Pune, Koramangala..."
                className="pl-11"
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-muted-foreground">Using fallback city data: {error}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading city feed...</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {filteredCities.map((city) => (
          <Link key={city.slug} to={`/discover/${city.slug}`}>
            <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:shadow-soft">
              <CityImage src={city.imageUrl} alt={city.name} slug={city.slug} className="h-52 w-full object-cover" />
              <CardHeader>
                <CardTitle>{city.name}</CardTitle>
                <CardDescription>{city.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Badge>{city._count?.profiles} seekers</Badge>
                  <Badge variant="outline">{city._count?.properties} listings</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {city.areas?.map((area) => (
                    <Badge key={area.name} variant="outline">
                      {area.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
