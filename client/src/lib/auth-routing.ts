import type { AuthUser } from "@/lib/types";

export function getPostAuthRoute(user: AuthUser) {
  if (user.role === "ADMIN") {
    return user.isProfileComplete ? "/admin" : "/profile";
  }

  if (!user.isProfileComplete) {
    return user.role === "LANDLORD" ? "/setup/landlord" : "/welcome";
  }

  if (user.role === "LANDLORD") {
    return "/landlord";
  }

  return "/profile";
}
