import { ArrowRight, Building2, MessageCircleMore, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { CityImage } from "@/components/city-image";
import { SectionHeading } from "@/components/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { featuredCities, sampleMatches, sampleProperties } from "@/data/mock";

export function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-hero-mesh px-6 py-10 shadow-soft sm:px-10 lg:px-12 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="flex flex-col gap-6">
            <Badge className="w-fit" variant="outline">
              City-first rental discovery
            </Badge>
            <div className="flex flex-col gap-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Find your city, find your flat, and find the right people to rent with.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                FlatBuddy helps students and working professionals match with compatible tenants,
                shortlist budget-friendly properties, and approach landlords together with more
                confidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/discover" className={buttonVariants({ size: "lg" })}>
                Start with a city
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/about" className={buttonVariants({ variant: "outline", size: "lg" })}>
                See how it works
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Live seekers", value: "480+" },
                { label: "Active listings", value: "150+" },
                { label: "Match confidence", value: "Up to 94%" },
              ].map((stat) => (
                <Card key={stat.label} className="border-white/60 bg-white/85">
                  <CardContent className="flex flex-col gap-1 p-5">
                    <span className="text-2xl font-semibold">{stat.value}</span>
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-white/60 bg-white/85">
            <CardHeader>
              <CardTitle>What makes FlatBuddy different</CardTitle>
              <CardDescription>Property search and flatmate matching happen together.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {[
                {
                  icon: UsersRound,
                  title: "Compatibility-led discovery",
                  description: "Match by budget, area, habits, move-in date, and interests.",
                },
                {
                  icon: MessageCircleMore,
                  title: "Negotiation-ready chat",
                  description: "Connect with future flatmates and talk to landlords from one place.",
                },
                {
                  icon: ShieldCheck,
                  title: "Trust and moderation",
                  description: "Admin review, reports, and verification keep listings cleaner.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl bg-muted/50 p-4">
                  <item.icon className="mt-1 size-5 text-primary" />
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Launch Cities"
          title="Choose a city first, then discover both rooms and people"
          description="The city dashboard becomes the main entry point: active seekers, average rent pockets, and ready-to-contact landlords in one place."
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {featuredCities.map((city) => (
            <Card key={city.slug} className="overflow-hidden">
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
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sample tenant matches</CardTitle>
            <CardDescription>Compatibility should feel helpful, not random.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {sampleMatches.map((match) => (
              <div key={match.name} className="rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{match.name}</p>
                    <p className="text-sm text-muted-foreground">{match.role}</p>
                  </div>
                  <Badge variant="success">{match.compatibility}% match</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {match.city} · {match.budget} · {match.moveIn}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {match.interests.slice(0, 3).map((interest) => (
                    <Badge key={interest} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sample property feed</CardTitle>
            <CardDescription>Landlords list spaces and seeker groups approach together.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {sampleProperties.map((property) => (
              <div key={property.title} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{property.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.city} · {property.area}
                    </p>
                  </div>
                  <Badge>{property.rent}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {property.type} · {property.availability}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.highlights.map((highlight) => (
                    <Badge key={highlight} variant="outline">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-4">
        {[
          {
            icon: Sparkles,
            title: "Common-interest intros",
            description: "Break the ice with shared hobbies, working style, and home habits.",
          },
          {
            icon: Building2,
            title: "Landlord workspace",
            description: "Property posting, tenant requests, and visit coordination in one dashboard.",
          },
          {
            icon: ShieldCheck,
            title: "Admin moderation",
            description: "Review reports, hide fake listings, and verify risky landlord activity.",
          },
          {
            icon: MessageCircleMore,
            title: "Future add-on",
            description: "Realtime group chat and visit scheduling on shortlisted homes.",
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
      </section>
    </div>
  );
}
