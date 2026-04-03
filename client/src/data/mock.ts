import type { City, MatchProfile, PropertyCardItem } from "@/lib/types";

export const featuredCities: City[] = [
  {
    name: "Bengaluru",
    slug: "bengaluru",
    state: "Karnataka",
    description: "Tech hub with strong flat-sharing demand around startup districts.",
    imageUrl:
      "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    areas: [
      { name: "Koramangala", averageRent: 14000, description: "Startup energy and easy social life." },
      { name: "HSR Layout", averageRent: 15500, description: "Popular with product and tech teams." },
      { name: "Marathahalli", averageRent: 12500, description: "Budget conscious with office access." },
    ],
    _count: {
      profiles: 182,
      properties: 64,
    },
  },
  {
    name: "Pune",
    slug: "pune",
    state: "Maharashtra",
    description: "Balanced city for students, freshers, and shared apartments.",
    imageUrl: "https://cdn.pixabay.com/photo/2019/03/16/11/16/city-4058828_1280.jpg",
    isFeatured: true,
    areas: [
      { name: "Hinjewadi", averageRent: 13000, description: "Good choice for IT commuters." },
      { name: "Viman Nagar", averageRent: 14500, description: "Modern neighborhood with cafes." },
      { name: "Kothrud", averageRent: 11500, description: "Student-friendly shared living." },
    ],
    _count: {
      profiles: 138,
      properties: 52,
    },
  },
  {
    name: "Delhi",
    slug: "delhi",
    state: "Delhi",
    description: "Large supply of rentals with highly varied budget pockets.",
    imageUrl:
      "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    areas: [
      { name: "Mukherjee Nagar", averageRent: 9000, description: "Coaching and exam-prep hotspot." },
      { name: "Saket", averageRent: 17000, description: "Well-connected premium demand." },
      { name: "Dwarka", averageRent: 12000, description: "Metro convenience and shared housing." },
    ],
    _count: {
      profiles: 164,
      properties: 71,
    },
  },
  {
    name: "Mumbai",
    slug: "mumbai",
    state: "Maharashtra",
    description: "Dense rental market with strong office-linked flat-sharing demand.",
    imageUrl:
      "https://media.gettyimages.com/id/110051019/photo/central-mumbai-skyline-india.jpg?s=612x612&w=0&k=20&c=_125IXXz9lsceJ5eoRQ5bVnE0lDBeLxKu0NxvX9jcn0=",
    isFeatured: true,
    areas: [
      { name: "Andheri", averageRent: 22000, description: "Busy rental zone with commute-heavy demand." },
      { name: "Powai", averageRent: 26000, description: "Modern area with premium shared apartments." },
      { name: "Navi Mumbai", averageRent: 16000, description: "Better budget spread for new movers." },
    ],
    _count: {
      profiles: 151,
      properties: 68,
    },
  },
  {
    name: "Hyderabad",
    slug: "hyderabad",
    state: "Telangana",
    description: "Fast-growing city with good value rentals around tech corridors.",
    imageUrl:
      "https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&w=1200&q=80",
    isFeatured: true,
    areas: [
      { name: "HITEC City", averageRent: 18000, description: "Popular for tech professionals and quick commutes." },
      { name: "Gachibowli", averageRent: 19500, description: "Strong demand for modern shared flats." },
      { name: "Kukatpally", averageRent: 13500, description: "Value-driven option with better rent flexibility." },
    ],
    _count: {
      profiles: 143,
      properties: 57,
    },
  },
  {
    name: "Chandigarh",
    slug: "chandigarh",
    state: "Chandigarh",
    description: "Cleaner, calmer city with student and early-career rental movement.",
    imageUrl:
      "https://thumbs.dreamstime.com/b/chandigarh-university-infrastructure-view-loveit-266099924.jpg",
    isFeatured: true,
    areas: [
      { name: "Sector 15", averageRent: 11500, description: "Popular among students and fresh movers." },
      { name: "Sector 22", averageRent: 14000, description: "Central access with solid shared-living demand." },
      { name: "Mohali", averageRent: 12500, description: "Budget-friendlier nearby option with growing activity." },
    ],
    _count: {
      profiles: 96,
      properties: 34,
    },
  },
];

export const sampleMatches: MatchProfile[] = [
  {
    name: "Aarav Menon",
    role: "Backend Engineer",
    city: "Bengaluru",
    budget: "₹12k - ₹15k",
    moveIn: "Within 2 weeks",
    lifestyle: ["Non-smoker", "Early riser", "Veg-friendly"],
    interests: ["Cricket", "Startup podcasts", "Weekend cafes"],
    compatibility: 94,
  },
  {
    name: "Riya Sharma",
    role: "MBA Student",
    city: "Pune",
    budget: "₹10k - ₹13k",
    moveIn: "This month",
    lifestyle: ["Quiet flat", "Clean kitchen", "Pet okay"],
    interests: ["Reading", "Gym", "Movie nights"],
    compatibility: 89,
  },
  {
    name: "Harshit Gupta",
    role: "Data Analyst",
    city: "Delhi",
    budget: "₹11k - ₹14k",
    moveIn: "Next 10 days",
    lifestyle: ["Occasional outings", "Non-smoker", "Night owl"],
    interests: ["Music", "Football", "Street food"],
    compatibility: 86,
  },
];

export const sampleProperties: PropertyCardItem[] = [
  {
    title: "Sunny 2BHK Near Metro",
    city: "Bengaluru",
    area: "HSR Layout",
    rent: "₹28,000",
    type: "Full Flat",
    availability: "Available from 10 Apr",
    highlights: ["Furnished", "2 bathrooms", "Wi-Fi ready"],
  },
  {
    title: "Shared Room for Students",
    city: "Pune",
    area: "Kothrud",
    rent: "₹9,500",
    type: "Shared Room",
    availability: "Immediate move-in",
    highlights: ["Walking distance to coaching", "Mess nearby", "Low deposit"],
  },
  {
    title: "Compact Studio for Two",
    city: "Delhi",
    area: "Dwarka",
    rent: "₹18,000",
    type: "Studio",
    availability: "Available from 18 Apr",
    highlights: ["Metro nearby", "Owner verified", "Gated society"],
  },
];
