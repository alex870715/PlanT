import { prisma } from "@/lib/prisma";
import { isValidSeedCode, normalizeSeedCode } from "@/lib/api";

export const SEED_HEADER = "x-plant-seed";


/**
 * 此 App 無帳號系統，seedCode 即為旅程的存取憑證。
 * 對 spot/member 等以 id 操作的端點，要求請求附帶所屬旅程的 seedCode，
 * 並驗證該資源確實屬於此旅程，避免「知道 id 就能改任何人資料」。
 */
export function getSeedFromRequest(request: Request): string | null {
  const raw = request.headers.get(SEED_HEADER);
  if (!raw) return null;
  const seed = normalizeSeedCode(raw);
  return isValidSeedCode(seed) ? seed : null;
}

export type AccessResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export async function authorizeSpot(
  request: Request,
  spotId: string
): Promise<AccessResult<{ tripId: string }>> {
  const spot = await prisma.spot.findUnique({
    where: { id: spotId },
    select: { id: true, tripId: true, trip: { select: { seedCode: true } } },
  });

  if (!spot) return { ok: false, status: 404, error: "Spot not found" };

  const seed = getSeedFromRequest(request);
  if (!seed) {
    return { ok: false, status: 401, error: "缺少旅程存取憑證" };
  }
  if (normalizeSeedCode(spot.trip.seedCode) !== seed) {
    return { ok: false, status: 403, error: "無權限操作此景點" };
  }

  return { ok: true, value: { tripId: spot.tripId } };
}

export async function authorizeMember(
  request: Request,
  memberId: string
): Promise<AccessResult<{ tripId: string }>> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, tripId: true, trip: { select: { seedCode: true } } },
  });

  if (!member) return { ok: false, status: 404, error: "Member not found" };

  const seed = getSeedFromRequest(request);
  if (!seed) {
    return { ok: false, status: 401, error: "缺少旅程存取憑證" };
  }
  if (normalizeSeedCode(member.trip.seedCode) !== seed) {
    return { ok: false, status: 403, error: "無權限操作此成員" };
  }

  return { ok: true, value: { tripId: member.tripId } };
}
