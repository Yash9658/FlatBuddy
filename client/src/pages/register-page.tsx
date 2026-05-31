import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, getOAuthUrl, isGoogleOAuthEnabled, error, clearError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (fullName.trim().length < 2) {
        throw new Error("Enter your full name.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      const response = await register({ fullName, email, password, role: "TENANT" });
      navigate(`/verify-email?email=${encodeURIComponent(response.email)}`);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Create your FlatBuddy account</CardTitle>
          <CardDescription>Create your account, then verify your email before logging in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Full name
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email
              <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Password
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                minLength={8}
                required
              />
            </label>
            {formError || error ? <p className="text-sm text-red-600">{formError ?? error}</p> : null}
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
          <Button
            onClick={() => (window.location.href = getOAuthUrl())}
            variant="outline"
            disabled={!isGoogleOAuthEnabled}
          >
            Continue with Google
          </Button>
          {!isGoogleOAuthEnabled ? (
            <p className="text-sm text-muted-foreground">
              Google sign-up is currently unavailable. Please use email signup.
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Already registered?{" "}
            <Link className="font-semibold text-primary" to="/login">
              Login instead
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
