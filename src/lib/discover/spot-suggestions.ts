import {
  DESTINATIONS,
  getDiscoverDeckBySlug,
  popularityLabel,
} from "@/lib/discover/catalog";
import type { DiscoverCard, DiscoverDestination } from "@/types/discover";

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function inferTripDestination(
  tripTitle: string,
  spots: { latitude: number; longitude: number }[]
): string {
  for (const dest of DESTINATIONS) {
    if (tripTitle.includes(dest.label)) return dest.slug;
    if (tripTitle.toLowerCase().includes(dest.slug)) return dest.slug;
  }

  if (spots.length > 0) {
    const lat =
      spots.reduce((sum, s) => sum + s.latitude, 0) / spots.length;
    const lng =
      spots.reduce((sum, s) => sum + s.longitude, 0) / spots.length;
    let nearest = DESTINATIONS[0];
    let minDist = Infinity;
    for (const d of DESTINATIONS) {
      const dist = haversineKm(lat, lng, d.center.lat, d.center.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = d;
      }
    }
    return nearest.slug;
  }

  return "fukuoka";
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function isExactName(name: string, existing: Set<string>): boolean {
  return existing.has(normalizeName(name));
}

function cardMatchesQuery(card: DiscoverCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    card.name,
    card.description,
    card.area ?? "",
    ...card.tags,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export type SpotSuggestion = DiscoverCard & {
  distanceKm?: number;
  popularityText: string;
  alreadyOnDay: boolean;
  alreadyInTrip: boolean;
};

export type SpotSuggestionResult = {
  destination: DiscoverDestination | null;
  suggestions: SpotSuggestion[];
};

export function suggestSpotsForDay(options: {
  tripTitle: string;
  tripSpots: { name: string; latitude: number; longitude: number }[];
  daySpots: { name: string; latitude: number; longitude: number }[];
  query?: string;
  limit?: number;
}): SpotSuggestionResult {
  const { tripTitle, tripSpots, daySpots, query = "", limit = 8 } = options;
  const slug = inferTripDestination(tripTitle, tripSpots);
  const deck = getDiscoverDeckBySlug(slug);

  if (!deck) {
    return { destination: null, suggestions: [] };
  }

  const dayNames = new Set(daySpots.map((s) => normalizeName(s.name)));
  const tripNames = new Set(tripSpots.map((s) => normalizeName(s.name)));

  const anchor =
    daySpots.length > 0
      ? { lat: daySpots[0].latitude, lng: daySpots[0].longitude }
      : deck.destination.center;

  const matched = deck.cards.filter((c) => cardMatchesQuery(c, query));

  const scored = matched.map((card) => ({
    ...card,
    distanceKm: haversineKm(
      anchor.lat,
      anchor.lng,
      card.latitude,
      card.longitude
    ),
    popularityText: popularityLabel(card.popularity),
    alreadyOnDay: isExactName(card.name, dayNames),
    alreadyInTrip: isExactName(card.name, tripNames),
  }));

  const q = query.trim();
  const sorted = q
    ? [...scored].sort((a, b) => b.popularity - a.popularity)
    : [...scored].sort((a, b) => {
        const distDiff = (a.distanceKm ?? 0) - (b.distanceKm ?? 0);
        if (Math.abs(distDiff) > 0.5) return distDiff;
        return b.popularity - a.popularity;
      });

  const fresh = sorted.filter((c) => !c.alreadyOnDay);
  const picked = (fresh.length > 0 ? fresh : sorted).slice(0, limit);

  return {
    destination: deck.destination,
    suggestions: picked,
  };
}
