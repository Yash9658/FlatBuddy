import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { getPostAuthRoute } from "@/lib/auth-routing";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, getOAuthUrl, isGoogleOAuthEnabled, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const oauthError = searchParams.get("error");
  const oauthErrorMessage =
    oauthError === "google_auth_failed" ? "Google sign-in failed. Please try again." : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      const currentUser = await login(email, password);
      navigate(getPostAuthRoute(currentUser));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Login to FlatBuddy</CardTitle>
          <CardDescription>Use email login, or continue with Google when OAuth is configured.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
                required
              />
            </label>
            {error || oauthErrorMessage ? <p className="text-sm text-red-600">{error ?? oauthErrorMessage}</p> : null}
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Login"}
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
              Google OAuth is currently unavailable until the Google client ID, secret, and callback URL are set.
            </p>
          ) : null}
          <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            Use email login for local accounts, or continue with Google once OAuth is configured in your backend env.
          </div>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link className="font-semibold text-primary" to="/register">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
