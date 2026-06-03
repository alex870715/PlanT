import { prisma } from "@/lib/prisma";
import { getDiscoverDeck } from "@/lib/discover/catalog";
import { generateSeedCode } from "@/lib/seed-code";
import type { DiscoverCard } from "@/types/discover";

export type MatchRoomPhase = "voting" | "closed" | "planted";

export type MatchRoomStatus = {
  phase: MatchRoomPhase;
  votingOpen: boolean;
  votingEndsAt: string;
};

export function getMatchRoomPhase(room: {
  votingEndsAt: Date | null;
  plantedSeedCode: string | null;
}): MatchRoomPhase {
  if (room.plantedSeedCode) return "planted";
  if (!room.votingEndsAt || new Date() >= room.votingEndsAt) return "closed";
  return "voting";
}

export function getMatchRoomStatus(room: {
  votingEndsAt: Date | null;
  plantedSeedCode: string | null;
}): MatchRoomStatus {
  const phase = getMatchRoomPhase(room);
  return {
    phase,
    votingOpen: phase === "voting",
    votingEndsAt: room.votingEndsAt?.toISOString() ?? new Date(0).toISOString(),
  };
}

export type CardVoteStats = {
  cardId: string;
  likes: number;
  passes: number;
  likeVoters: string[];
};

export async function generateUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const roomCode = generateSeedCode();
    const [trip, room] = await Promise.all([
      prisma.trip.findUnique({
        where: { seedCode: roomCode },
        select: { id: true },
      }),
      prisma.matchRoom.findUnique({
        where: { roomCode },
        select: { id: true },
      }),
    ]);
    if (!trip && !room) return roomCode;
  }
  throw new Error("Failed to generate room code");
}

export function aggregateVoteStats(
  votes: { cardId: string; vote: string; voterName: string }[]
): { voterCount: number; byCard: Map<string, CardVoteStats> } {
  const voters = new Set<string>();
  const byCard = new Map<string, CardVoteStats>();

  for (const v of votes) {
    voters.add(v.voterName.trim());
    let entry = byCard.get(v.cardId);
    if (!entry) {
      entry = { cardId: v.cardId, likes: 0, passes: 0, likeVoters: [] };
      byCard.set(v.cardId, entry);
    }
    if (v.vote === "like") {
      entry.likes += 1;
      entry.likeVoters.push(v.voterName.trim());
    } else if (v.vote === "pass") {
      entry.passes += 1;
    }
  }

  return { voterCount: voters.size, byCard };
}

export function deckWithVoteStats(
  cards: DiscoverCard[],
  byCard: Map<string, CardVoteStats>,
  voterCount: number
): (DiscoverCard & { groupLikes: number; groupLabel: string })[] {
  return cards.map((card) => {
    const stats = byCard.get(card.id);
    const likes = stats?.likes ?? 0;
    const label =
      voterCount > 0 && likes > 0
        ? `♥ ${likes}/${voterCount} 人想去`
        : voterCount > 0
          ? "尚未有人收藏"
          : "";
    return { ...card, groupLikes: likes, groupLabel: label };
  });
}

/** 揪團精選：至少 1 人收藏，依票數排序 */
export function pickGroupLikedCards(
  cards: DiscoverCard[],
  byCard: Map<string, CardVoteStats>
): DiscoverCard[] {
  return cards
    .filter((c) => (byCard.get(c.id)?.likes ?? 0) > 0)
    .sort(
      (a, b) =>
        (byCard.get(b.id)?.likes ?? 0) - (byCard.get(a.id)?.likes ?? 0)
    );
}

export function getCardsByIds(
  destinationSlug: string,
  cardIds: string[]
): DiscoverCard[] {
  const deck = getDiscoverDeck(destinationSlug);
  if (!deck) return [];
  const map = new Map(deck.cards.map((c) => [c.id, c]));
  return cardIds.map((id) => map.get(id)).filter(Boolean) as DiscoverCard[];
}
