import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">About FlatBuddy</span>
        <h1 className="text-3xl font-semibold tracking-tight">Why this product should exist</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Moving to a new city is hard because people do not just need a room. They need a safe area,
          manageable rent, compatible housemates, and enough confidence to deal with landlords.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {[
          {
            title: "Problem",
            description:
              "Students and professionals often find rooms that are either too expensive, poorly matched, or require fast decisions without knowing who they will live with.",
          },
          {
            title: "Solution",
            description:
              "FlatBuddy combines city discovery, property listings, compatibility-based partner search, and landlord communication in one product flow.",
          },
          {
            title: "Business potential",
            description:
              "Revenue can come from premium seeker plans, landlord subscriptions, listing boosts, verification fees, and relocation service partnerships.",
          },
        ].map((block) => (
          <Card key={block.title}>
            <CardHeader>
              <CardTitle>{block.title}</CardTitle>
              <CardDescription>{block.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">
              This scaffold is already shaped to support a real startup-style roadmap rather than just a
              classroom CRUD app.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
