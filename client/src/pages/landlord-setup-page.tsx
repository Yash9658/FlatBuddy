import { useEffect, useState } from "react";
import { Building2, CalendarCheck2, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useCities } from "@/hooks/use-cities";
import { apiFetch } from "@/lib/api";
import type { OccupationType } from "@/lib/types";

const occupationOptions: OccupationType[] = ["OTHER", "WORKING_PROFESSIONAL", "FREELANCER"];

export function LandlordSetupPage() {
  const navigate = useNavigate();
  const { user, accessToken, refreshUser } = useAuth();
  const { cities, error: citiesError, isLoading: citiesLoading } = useCities({ allowFallback: false });
  const [fullName, setFullName] = useState("");
  const [occupation, setOccupation] = useState<OccupationType>("OTHER");
  const [currentCity, setCurrentCity] = useState("");
  const [targetCityId, setTargetCityId] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [verificationDocumentUrl, setVerificationDocumentUrl] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.profile?.fullName ?? "");
    setOccupation(user.profile?.occupation ?? "OTHER");
    setCurrentCity(user.profile?.currentCity ?? "");
    setTargetCityId(user.profile?.targetCityId ?? "");
    setPreferredArea(user.profile?.preferredArea ?? "");
    setPhone(user.profile?.phone ?? "");
    setBio(user.profile?.bio ?? "");
    setVerificationDocumentUrl(user.landlordVerificationDocumentUrl ?? "");
    setVerificationNotes(user.landlordVerificationNotes ?? "");
  }, [user]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to continue</CardTitle>
          <CardDescription>Landlord setup starts after authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link className={buttonVariants()} to="/login">
            Login / Signup
          </Link>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (!fullName.trim() || !targetCityId || !preferredArea.trim() || !phone.trim()) {
        throw new Error("Add full name, primary listing city, preferred area, and phone number before continuing.");
      }

      if (citiesLoading || citiesError || !cities.some((city) => city.id === targetCityId)) {
        throw new Error("Cities are not available right now. Refresh and try again.");
      }

      await apiFetch("/profile", {
        method: "PUT",
        token: accessToken,
        body: JSON.stringify({
          fullName,
          occupation,
          currentCity,
          targetCityId: targetCityId || undefined,
          preferredArea,
          phone: phone || undefined,
          bio,
        }),
      });

      if (verificationDocumentUrl) {
        await apiFetch("/profile/verification", {
          method: "POST",
          token: accessToken,
          body: JSON.stringify({
            documentUrl: verificationDocumentUrl,
            notes: verificationNotes || undefined,
          }),
        });
      }

      await refreshUser();
      navigate("/landlord");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete landlord setup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Set up your landlord workspace</CardTitle>
          <CardDescription>
            Add your owner profile first so FlatBuddy can take you into listing creation and visit management cleanly.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Owner details</CardTitle>
              <CardDescription>These details help tenants understand who is managing the property side.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Full name
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Role / occupation
                  <select
                    value={occupation}
                    onChange={(event) => setOccupation(event.target.value as OccupationType)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {occupationOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Current city
                  <Input value={currentCity} onChange={(event) => setCurrentCity(event.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Primary listing city
                  <select
                    value={targetCityId}
                    onChange={(event) => setTargetCityId(event.target.value)}
                    disabled={citiesLoading || Boolean(citiesError)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">{citiesLoading ? "Loading cities..." : "Select city"}</option>
                    {cities.map((city) => (
                      <option key={city.id ?? city.slug} value={city.id ?? ""}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Preferred area
                  <Input value={preferredArea} onChange={(event) => setPreferredArea(event.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Phone number
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Short intro
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Tell tenants what kind of properties you manage and what move-ins you support."
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Optional verification request</CardTitle>
              <CardDescription>
                Add a verification document now if you want admin review to start early.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Document URL
                <Input
                  value={verificationDocumentUrl}
                  onChange={(event) => setVerificationDocumentUrl(event.target.value)}
                  placeholder="Link to ownership proof or another review document"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Note for admin review
                <Textarea
                  value={verificationNotes}
                  onChange={(event) => setVerificationNotes(event.target.value)}
                  placeholder="Optional context about your property ownership or management setup"
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
            <CardDescription>Your landlord workspace will open right after setup.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              {
                icon: Building2,
                title: "Start posting listings",
                description: "You will land directly in the landlord workspace and can publish your first property.",
              },
              {
                icon: CalendarCheck2,
                title: "Manage tenant visits",
                description: "As soon as listings are live, visit requests and inquiries can flow into your dashboard.",
              },
              {
                icon: ShieldCheck,
                title: "Optional trust signals",
                description: "If you add a document URL now, admin verification can begin immediately.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center gap-3">
                  <item.icon className="size-4 text-primary" />
                  <p className="font-medium">{item.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? "Saving setup..." : "Continue to landlord workspace"}
              </Button>
              <Link className={buttonVariants({ variant: "outline" })} to="/welcome">
                Back
              </Link>
            </div>
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
            {citiesError ? <p className="text-sm text-red-600">Unable to load cities: {citiesError}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
