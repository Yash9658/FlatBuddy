import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [message, setMessage] = useState<string | null>(token ? "Verifying your email..." : null);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function verifyToken() {
      if (!token) {
        return;
      }

      try {
        const response = await apiFetch<{ message: string }>("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });

        if (!ignore) {
          setMessage(response.message);
          setError(null);
        }
      } catch (verifyError) {
        if (!ignore) {
          setMessage(null);
          setError(verifyError instanceof Error ? verifyError.message : "Unable to verify email.");
        }
      }
    }

    void verifyToken();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleResend() {
    setIsResending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch<{ message: string }>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(response.message);
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to send verification email.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Use the verification link sent to your inbox before logging in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!token ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Email
                <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
              </label>
              <Button disabled={isResending || !email.trim()} onClick={() => void handleResend()}>
                {isResending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          ) : null}
          <Link className={buttonVariants({ variant: "outline" })} to="/login">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
