import { describe, expect, it } from "vitest";
import {
  aggregateVoteStats,
  deckWithVoteStats,
  normalizeVoterName,
  voterDedupKey,
} from "./match-room";

describe("match-room vote integrity", () => {
  it("normalizeVoterName 去多餘空白並限制長度", () => {
    expect(normalizeVoterName("  Alex   Chen  ")).toBe("Alex Chen");
    expect(normalizeVoterName("a".repeat(50)).length).toBe(24);
  });

  it("voterDedupKey 忽略大小寫", () => {
    expect(voterDedupKey("Alex")).toBe(voterDedupKey("alex"));
    expect(voterDedupKey(" ALEX ")).toBe("alex");
  });

  it("aggregateVoteStats 對同一人同卡 like 去重", () => {
    const { voterCount, byCard } = aggregateVoteStats([
      { cardId: "c1", vote: "like", voterName: "Alex" },
      { cardId: "c1", vote: "like", voterName: "alex" },
      { cardId: "c1", vote: "like", voterName: "Bob" },
      { cardId: "c1", vote: "pass", voterName: "Carol" },
    ]);
    expect(voterCount).toBe(3);
    const c1 = byCard.get("c1")!;
    expect(c1.likes).toBe(2);
    expect(c1.passes).toBe(1);
    expect(c1.likeVoters).toEqual(["Alex", "Bob"]);
  });

  it("deckWithVoteStats 顯示有投的人名，不顯示比例", () => {
    const { voterCount, byCard } = aggregateVoteStats([
      { cardId: "c1", vote: "like", voterName: "Alex" },
      { cardId: "c1", vote: "like", voterName: "Bob" },
      { cardId: "c2", vote: "pass", voterName: "Carol" },
    ]);
    const cards = deckWithVoteStats(
      [
        { id: "c1", name: "A", category: "spot", description: "", popularity: 90, latitude: 0, longitude: 0, tags: [] },
        { id: "c2", name: "B", category: "spot", description: "", popularity: 80, latitude: 0, longitude: 0, tags: [] },
      ],
      byCard,
      voterCount
    );
    expect(cards[0].groupLabel).toBe("♥ Alex、Bob");
    expect(cards[1].groupLabel).toBe("尚未有人收藏");
  });
});
