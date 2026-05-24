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
            content:
              "The real pain point is not only finding a room, but reducing uncertainty around budget, compatibility, safety, and coordination.",
          },
          {
            title: "Solution",
            description:
              "FlatBuddy combines city discovery, property listings, compatibility-based partner search, and landlord communication in one product flow.",
            content:
              "The product joins renter matching, landlord outreach, chat, and planning into one journey instead of splitting them across separate apps.",
          },
          {
            title: "Business potential",
            description:
              "Revenue can come from premium seeker plans, landlord subscriptions, listing boosts, verification fees, and relocation service partnerships.",
            content:
              "That gives the platform room to grow from a useful student tool into a multi-sided rental marketplace with repeatable monetization.",
          },
        ].map((block) => (
          <Card key={block.title}>
            <CardHeader>
              <CardTitle>{block.title}</CardTitle>
              <CardDescription>{block.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-muted-foreground">{block.content}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
