import { Link } from "react-router-dom";
import { CircleSlash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BillingCancelPage() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground">
          <CircleSlash2 className="size-6" />
        </div>
        <CardTitle>Checkout canceled</CardTitle>
        <CardDescription>
          No charge was made. You can revisit pricing whenever you want to enable premium discovery or listing boosts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link className={buttonVariants()} to="/pricing">
          Return to pricing
        </Link>
      </CardContent>
    </Card>
  );
}
