import { describe, expect, it } from "vitest";
import {
  aggregateVoteStats,
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
});
