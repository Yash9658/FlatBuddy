import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { getPostAuthRoute } from "@/lib/auth-routing";

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearError, completeOAuth } = useAuth();
  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    clearError();
    let timeout = 0;

    async function finishOAuth() {
      if (!token || error) {
        return;
      }

      try {
        const currentUser = await completeOAuth(token);
        timeout = window.setTimeout(() => {
          navigate(getPostAuthRoute(currentUser), { replace: true });
        }, 1200);
      } catch {
        navigate("/login?error=google_auth_failed", { replace: true });
      }
    }

    void finishOAuth();

    return () => window.clearTimeout(timeout);
  }, [clearError, completeOAuth, error, navigate, token]);

  if (!token || error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Google sign-in could not be completed</CardTitle>
            <CardDescription>
              OAuth finished without a valid access token, or Google returned an error back to FlatBuddy.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-7 text-muted-foreground">
            <p>{error ? `Reason: ${error}` : "Please try again from the login page."}</p>
            <Button onClick={() => navigate("/login")} type="button">
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Signing you into FlatBuddy</CardTitle>
          <CardDescription>Your Google account is verified. We are completing the FlatBuddy session now.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-muted-foreground">
          One moment while we finish the Google OAuth login and redirect you into your profile.
        </CardContent>
      </Card>
    </div>
  );
}
