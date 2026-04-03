import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";

export function BillingSuccessPage() {
  const { refreshUser } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, []);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CheckCircle2 className="size-6" />
        </div>
        <CardTitle>Subscription started</CardTitle>
        <CardDescription>
          Stripe returned successfully. You can keep exploring the app while future premium entitlements are wired in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link className={buttonVariants()} to="/pricing">
          Back to pricing
        </Link>
        <Link className={buttonVariants({ variant: "outline" })} to="/discover">
          Explore cities
        </Link>
      </CardContent>
    </Card>
  );
}
