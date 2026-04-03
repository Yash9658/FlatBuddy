import type { Preference, Profile } from "@prisma/client";

type UserForMatching = {
  profile: Profile | null;
  preference: Preference | null;
};

export function getSharedInterests(current: UserForMatching, candidate: UserForMatching) {
  if (!current.preference || !candidate.preference) {
    return [];
  }

  return current.preference.interests.filter((interest) => candidate.preference?.interests.includes(interest));
}

export function buildMatchInsights(current: UserForMatching, candidate: UserForMatching) {
  const insights: string[] = [];

  if (
    current.profile?.budgetMin &&
    current.profile?.budgetMax &&
    candidate.profile?.budgetMin &&
    candidate.profile?.budgetMax
  ) {
    const overlap =
      Math.min(current.profile.budgetMax, candidate.profile.budgetMax) -
      Math.max(current.profile.budgetMin, candidate.profile.budgetMin);

    if (overlap >= 0) {
      insights.push("Budget ranges overlap");
    }
  }

  if (
    current.profile?.preferredArea &&
    candidate.profile?.preferredArea &&
    current.profile.preferredArea === candidate.profile.preferredArea
  ) {
    insights.push(`Both prefer ${candidate.profile.preferredArea}`);
  }

  if (
    current.preference?.foodPreference &&
    current.preference.foodPreference === candidate.preference?.foodPreference
  ) {
    insights.push("Similar food preference");
  }

  if (
    current.preference?.smokingPreference &&
    current.preference.smokingPreference === candidate.preference?.smokingPreference
  ) {
    insights.push("Smoking preference aligns");
  }

  if (
    current.preference?.drinkingPreference &&
    current.preference.drinkingPreference === candidate.preference?.drinkingPreference
  ) {
    insights.push("Drinking preference aligns");
  }

  const sharedInterests = getSharedInterests(current, candidate);

  if (sharedInterests.length > 0) {
    insights.push(`Shared interests: ${sharedInterests.slice(0, 2).join(", ")}`);
  }

  if (current.profile?.moveInDate && candidate.profile?.moveInDate) {
    const gap = Math.abs(current.profile.moveInDate.getTime() - candidate.profile.moveInDate.getTime());
    const daysGap = Math.round(gap / (1000 * 60 * 60 * 24));

    if (daysGap <= 14) {
      insights.push("Move-in timing is closely aligned");
    }
  }

  return insights.slice(0, 3);
}

export function calculateCompatibilityScore(current: UserForMatching, candidate: UserForMatching) {
  let score = 0;

  if (!current.profile || !candidate.profile) {
    return 20;
  }

  if (current.profile.targetCityId && current.profile.targetCityId === candidate.profile.targetCityId) {
    score += 20;
  }

  if (
    current.profile.budgetMin &&
    current.profile.budgetMax &&
    candidate.profile.budgetMin &&
    candidate.profile.budgetMax
  ) {
    const overlap =
      Math.min(current.profile.budgetMax, candidate.profile.budgetMax) -
      Math.max(current.profile.budgetMin, candidate.profile.budgetMin);

    if (overlap >= 0) {
      score += 25;
    }
  }

  if (current.profile.preferredArea && current.profile.preferredArea === candidate.profile.preferredArea) {
    score += 10;
  }

  if (current.preference && candidate.preference) {
    if (current.preference.foodPreference === candidate.preference.foodPreference) {
      score += 10;
    }

    if (current.preference.smokingPreference === candidate.preference.smokingPreference) {
      score += 10;
    }

    if (current.preference.drinkingPreference === candidate.preference.drinkingPreference) {
      score += 10;
    }

    const sharedInterests = getSharedInterests(current, candidate);

    if (sharedInterests.length > 0) {
      score += Math.min(sharedInterests.length * 5, 15);
    }
  }

  return Math.min(score, 100);
}
