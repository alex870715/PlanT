/** 解析主辦成員 id（舊旅程可能未寫入 hostMemberId） */
export function resolveHostMemberId(
  hostMemberId: string | null | undefined,
  members: { id: string; isHost?: boolean }[]
): string | null {
  if (hostMemberId) return hostMemberId;
  const flagged = members.find((m) => m.isHost);
  if (flagged) return flagged.id;
  return members[0]?.id ?? null;
}
