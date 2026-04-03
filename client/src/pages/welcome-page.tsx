import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { getPostAuthRoute } from "@/lib/auth-routing";
import type { UserRole } from "@/lib/types";

const selectableRoles: Array<{
  role: Extract<UserRole, "TENANT" | "LANDLORD">;
  title: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    role: "TENANT",
    title: "I am looking for a place",
    description: "Find compatible flatmates, discover city listings, and coordinate visits together.",
    icon: UserRound,
  },
  {
    role: "LANDLORD",
    title: "I want to list a property",
    description: "Post rooms or flats, review tenant interest, and manage visits from one dashboard.",
    icon: Building2,
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const { user, updateRoleSelection } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Extract<UserRole, "TENANT" | "LANDLORD">>(
    user?.role === "LANDLORD" ? "LANDLORD" : "TENANT",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      navigate(getPostAuthRoute(user), { replace: true });
      return;
    }

    if (user?.isProfileComplete) {
      navigate("/profile", { replace: true });
    }
  }, [navigate, user]);

  async function handleContinue() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      await updateRoleSelection(selectedRole);
      navigate(selectedRole === "LANDLORD" ? "/setup/landlord" : "/setup/tenant");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your account type.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to FlatBuddy</CardTitle>
          <CardDescription>
            You are signed in. Before we continue, choose what you want to do on the platform.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {selectableRoles.map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => setSelectedRole(item.role)}
              className={`rounded-[1.75rem] border p-6 text-left transition ${
                selectedRole === item.role
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border bg-card hover:border-primary/40 hover:bg-white"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary shadow-soft">
                  <item.icon className="size-5" />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-semibold">{item.title}</p>
                  <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin access</CardTitle>
            <CardDescription>
              Admin is not a public signup path. It is assigned manually for moderation and platform operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-7 text-muted-foreground">
              <div className="mb-3 flex items-center gap-3 font-medium text-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Admin role is invite-only
              </div>
              If someone should manage reports, landlord verification, or moderation, promote that account later from the
              database or admin tooling.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void handleContinue()} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Continue to profile setup"}
              </Button>
              <Link className={buttonVariants({ variant: "outline" })} to="/about">
                Learn about FlatBuddy
              </Link>
            </div>
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
