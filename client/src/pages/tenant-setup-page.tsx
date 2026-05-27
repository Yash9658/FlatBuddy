import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";
import { useCities } from "@/hooks/use-cities";
import { apiFetch } from "@/lib/api";
import type {
  DrinkingPreference,
  FoodPreference,
  OccupationType,
  SmokingPreference,
} from "@/lib/types";

const occupationOptions: OccupationType[] = [
  "STUDENT",
  "WORKING_PROFESSIONAL",
  "FREELANCER",
  "OTHER",
];

const foodOptions: FoodPreference[] = ["VEGETARIAN", "NON_VEGETARIAN", "EGGETARIAN", "FLEXIBLE"];
const smokingOptions: SmokingPreference[] = ["NO", "OCCASIONAL", "YES", "FLEXIBLE"];
const drinkingOptions: DrinkingPreference[] = ["NO", "OCCASIONAL", "YES", "FLEXIBLE"];

export function TenantSetupPage() {
  const navigate = useNavigate();
  const { user, accessToken, refreshUser } = useAuth();
  const { cities } = useCities();
  const [fullName, setFullName] = useState("");
  const [occupation, setOccupation] = useState<OccupationType>("WORKING_PROFESSIONAL");
  const [currentCity, setCurrentCity] = useState("");
  const [targetCityId, setTargetCityId] = useState("");
  const [preferredArea, setPreferredArea] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [bio, setBio] = useState("");
  const [foodPreference, setFoodPreference] = useState<FoodPreference>("FLEXIBLE");
  const [smokingPreference, setSmokingPreference] = useState<SmokingPreference>("FLEXIBLE");
  const [drinkingPreference, setDrinkingPreference] = useState<DrinkingPreference>("FLEXIBLE");
  const [cleanlinessLevel, setCleanlinessLevel] = useState("3");
  const [sleepSchedule, setSleepSchedule] = useState("");
  const [languagePreferences, setLanguagePreferences] = useState("");
  const [interests, setInterests] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFullName(user.profile?.fullName ?? "");
    setOccupation(user.profile?.occupation ?? "WORKING_PROFESSIONAL");
    setCurrentCity(user.profile?.currentCity ?? "");
    setTargetCityId(user.profile?.targetCityId ?? "");
    setPreferredArea(user.profile?.preferredArea ?? "");
    setBudgetMin(user.profile?.budgetMin?.toString() ?? "");
    setBudgetMax(user.profile?.budgetMax?.toString() ?? "");
    setMoveInDate(user.profile?.moveInDate?.slice(0, 10) ?? "");
    setBio(user.profile?.bio ?? "");
    setFoodPreference(user.preference?.foodPreference ?? "FLEXIBLE");
    setSmokingPreference(user.preference?.smokingPreference ?? "FLEXIBLE");
    setDrinkingPreference(user.preference?.drinkingPreference ?? "FLEXIBLE");
    setCleanlinessLevel(String(user.preference?.cleanlinessLevel ?? 3));
    setSleepSchedule(user.preference?.sleepSchedule ?? "");
    setLanguagePreferences((user.preference?.languagePreferences ?? []).join(", "));
    setInterests((user.preference?.interests ?? []).join(", "));
  }, [user]);

  if (!user || !accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to continue</CardTitle>
          <CardDescription>Tenant setup starts after authentication.</CardDescription>
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
      const minimumBudget = Number(budgetMin);
      const maximumBudget = Number(budgetMax);

      if (fullName.trim().length < 2 || !targetCityId || !budgetMin || !budgetMax) {
        throw new Error("Add full name, target city, and budget range before continuing.");
      }

      if (!Number.isFinite(minimumBudget) || !Number.isFinite(maximumBudget) || minimumBudget <= 0 || maximumBudget <= 0) {
        throw new Error("Enter a valid budget range.");
      }

      if (minimumBudget > maximumBudget) {
        throw new Error("Minimum budget cannot be greater than maximum budget.");
      }

      if (isPastDateInput(moveInDate)) {
        throw new Error("Move-in date cannot be before today.");
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
          budgetMin: minimumBudget,
          budgetMax: maximumBudget,
          moveInDate: moveInDate || undefined,
          bio,
        }),
      });

      await apiFetch("/profile/preferences", {
        method: "PUT",
        token: accessToken,
        body: JSON.stringify({
          foodPreference,
          smokingPreference,
          drinkingPreference,
          cleanlinessLevel: Number(cleanlinessLevel),
          sleepSchedule,
          petsFriendly: false,
          languagePreferences: splitCsv(languagePreferences),
          interests: splitCsv(interests),
        }),
      });

      await refreshUser();
      navigate("/matches");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete tenant setup.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Set up your tenant profile</CardTitle>
          <CardDescription>
            Tell FlatBuddy where you want to move, what budget you are targeting, and the kind of home vibe you prefer.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Move details</CardTitle>
              <CardDescription>These basics unlock city matching, property fit, and future group formation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Full name
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Occupation
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
                  Target city
                  <select
                    value={targetCityId}
                    onChange={(event) => setTargetCityId(event.target.value)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select target city</option>
                    {cities.map((city) => (
                      <option key={city.id ?? city.slug} value={city.id}>
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
                  Move-in date
                  <Input value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} min={getTodayDateInputValue()} type="date" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Minimum budget
                  <Input value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} type="number" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Maximum budget
                  <Input value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} type="number" />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Intro bio
                <Textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Share what kind of home, commute, and flatmate vibe you are looking for."
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lifestyle preferences</CardTitle>
              <CardDescription>These help FlatBuddy surface more compatible tenant partners.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Food preference
                  <select
                    value={foodPreference}
                    onChange={(event) => setFoodPreference(event.target.value as FoodPreference)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {foodOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Smoking preference
                  <select
                    value={smokingPreference}
                    onChange={(event) => setSmokingPreference(event.target.value as SmokingPreference)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {smokingOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Drinking preference
                  <select
                    value={drinkingPreference}
                    onChange={(event) => setDrinkingPreference(event.target.value as DrinkingPreference)}
                    className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {drinkingOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Cleanliness level
                  <Input
                    value={cleanlinessLevel}
                    onChange={(event) => setCleanlinessLevel(event.target.value)}
                    min="1"
                    max="5"
                    type="number"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Sleep schedule
                  <Input value={sleepSchedule} onChange={(event) => setSleepSchedule(event.target.value)} />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Languages
                  <Input
                    value={languagePreferences}
                    onChange={(event) => setLanguagePreferences(event.target.value)}
                    placeholder="English, Hindi, Marathi"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Interests
                <Input
                  value={interests}
                  onChange={(event) => setInterests(event.target.value)}
                  placeholder="Gym, Cricket, Reading, Weekend cafes"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {splitCsv(interests).map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
            <CardDescription>Once this is saved, FlatBuddy can start acting like a real partner finder.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              {
                icon: UsersRound,
                title: "Partner matching unlocks",
                description: "Your budget, city, and interests start shaping match scores immediately.",
              },
              {
                icon: Sparkles,
                title: "Compatibility gets smarter",
                description: "Lifestyle choices help the app highlight better roommate conversations.",
              },
              {
                icon: ArrowRight,
                title: "Next stop: matches",
                description: "After saving, we will take you straight to the partner finder.",
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
                {isSubmitting ? "Saving setup..." : "Continue to partner finder"}
              </Button>
              <Link className={buttonVariants({ variant: "outline" })} to="/welcome">
                Back
              </Link>
            </div>
            {message ? <p className="text-sm text-red-600">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isPastDateInput(value: string) {
  return Boolean(value && value < getTodayDateInputValue());
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
