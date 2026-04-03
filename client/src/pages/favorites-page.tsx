import { Heart, Search, Users2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { useSavedProperties, useSavedUsers } from "@/hooks/use-saved";
import { resolveAssetUrl } from "@/lib/constants";

export function FavoritesPage() {
  const { accessToken, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSection, setActiveSection] = useState<"all" | "users" | "properties">("all");
  const { items: savedUsers, isLoading: usersLoading, error: usersError } = useSavedUsers(accessToken);
  const {
    items: savedProperties,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useSavedProperties(accessToken);

  const filteredSavedUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return savedUsers.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        item.target.profile?.fullName,
        item.target.email,
        item.target.profile?.targetCity?.name,
        item.target.profile?.preferredArea,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [savedUsers, searchTerm]);

  const filteredSavedProperties = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return savedProperties.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        item.property.title,
        item.property.city.name,
        item.property.areaName,
        item.property.description,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [savedProperties, searchTerm]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Login to access favorites</CardTitle>
          <CardDescription>Saved users and properties are personal to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-600">
              <Heart className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total saved</p>
              <p className="text-2xl font-semibold">{savedUsers.length + savedProperties.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600">
              <Users2 className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saved partners</p>
              <p className="text-2xl font-semibold">{savedUsers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saved properties</p>
            <p className="mt-2 text-2xl font-semibold">{savedProperties.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search saved people or properties"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveSection("all")} size="sm" variant={activeSection === "all" ? "default" : "outline"}>
              All
            </Button>
            <Button onClick={() => setActiveSection("users")} size="sm" variant={activeSection === "users" ? "default" : "outline"}>
              Partners
            </Button>
            <Button
              onClick={() => setActiveSection("properties")}
              size="sm"
              variant={activeSection === "properties" ? "default" : "outline"}
            >
              Properties
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {(activeSection === "all" || activeSection === "users") ? (
          <Card>
            <CardHeader>
              <CardTitle>Saved tenant partners</CardTitle>
              <CardDescription>Come back to the people you want to message or group with later.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {usersError ? <p className="text-sm text-muted-foreground">{usersError}</p> : null}
              {usersLoading ? <p className="text-sm text-muted-foreground">Loading saved users...</p> : null}
              {!usersLoading && filteredSavedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved partners match the current search.</p>
              ) : null}
              {filteredSavedUsers.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.target.profile?.fullName ?? item.target.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.target.profile?.targetCity?.name ?? "Target city not set"} |{" "}
                        {item.target.profile?.preferredArea ?? "Area flexible"}
                      </p>
                    </div>
                    <Badge variant="outline">{item.target.role.toLowerCase()}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.target.preference?.interests ?? []).slice(0, 4).map((interest) => (
                      <Badge key={interest} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} to={`/partners/${item.target.id}`}>
                      View profile
                    </Link>
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} to="/matches">
                      Open matches
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {(activeSection === "all" || activeSection === "properties") ? (
          <Card>
            <CardHeader>
              <CardTitle>Saved properties</CardTitle>
              <CardDescription>Shortlist listings before you coordinate with partners or landlords.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {propertiesError ? <p className="text-sm text-muted-foreground">{propertiesError}</p> : null}
              {propertiesLoading ? <p className="text-sm text-muted-foreground">Loading saved properties...</p> : null}
              {!propertiesLoading && filteredSavedProperties.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved properties match the current search.</p>
              ) : null}
              {filteredSavedProperties.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.property.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.property.city.name} | {item.property.areaName}
                      </p>
                    </div>
                    <Badge>Rs. {item.property.monthlyRent.toLocaleString("en-IN")}</Badge>
                  </div>
                  {item.property.images[0]?.url ? (
                    <img
                      src={resolveAssetUrl(item.property.images[0].url)}
                      alt={item.property.images[0].altText ?? item.property.title}
                      className="mt-3 h-40 w-full rounded-2xl object-cover"
                    />
                  ) : null}
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.property.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{item.property.propertyType.toLowerCase().replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">
                      Deposit Rs. {item.property.securityDeposit.toLocaleString("en-IN")}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Link className={buttonVariants({ variant: "outline", size: "sm" })} to={`/properties/${item.property.id}`}>
                      View property
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
