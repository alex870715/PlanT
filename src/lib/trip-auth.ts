import { prisma } from "@/lib/prisma";
import { isValidSeedCode, normalizeSeedCode } from "@/lib/api";
import {
  requireTripEdit,
  requireTripHost,
  resolveTripAccess,
  type TripAccessContext,
  type AccessResult,
} from "@/lib/trip-access";

export const SEED_HEADER = "x-plant-seed";
export const MEMBER_HEADER = "x-plant-member";

export type { AccessResult };

/**
 * 此 App 以 seedCode 作為旅程存取憑證；編輯需登入並加入旅程。
 */
export function getSeedFromRequest(request: Request): string | null {
  const raw = request.headers.get(SEED_HEADER);
  if (!raw) return null;
  const seed = normalizeSeedCode(raw);
  return isValidSeedCode(seed) ? seed : null;
}

export { requireTripEdit, requireTripHost, resolveTripAccess };
export type { TripAccessContext };

export async function authorizeSpot(
  request: Request,
  spotId: string,
  options?: { requireHost?: boolean }
): Promise<AccessResult<{ tripId: string; access: TripAccessContext }>> {
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

  const auth = options?.requireHost
    ? await requireTripHost(request, seed)
    : await requireTripEdit(request, seed);
  if (!auth.ok) return auth;

  return {
    ok: true,
    value: { tripId: spot.tripId, access: auth.value },
  };
}

export async function authorizeMember(
  request: Request,
  memberId: string,
  options?: { requireHost?: boolean }
): Promise<AccessResult<{ tripId: string; access: TripAccessContext }>> {
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

  const auth = options?.requireHost
    ? await requireTripHost(request, seed)
    : await requireTripEdit(request, seed);
  if (!auth.ok) return auth;

  return {
    ok: true,
    value: { tripId: member.tripId, access: auth.value },
  };
}

export async function authorizeTripBySeedCode(
  request: Request,
  seedCode: string,
  options?: { requireHost?: boolean }
): Promise<AccessResult<TripAccessContext>> {
  const seed = normalizeSeedCode(seedCode);
  if (!isValidSeedCode(seed)) {
    return { ok: false, status: 400, error: "Invalid seed code format" };
  }

  const headerSeed = getSeedFromRequest(request);
  if (headerSeed && normalizeSeedCode(headerSeed) !== seed) {
    return { ok: false, status: 403, error: "Seed 不一致" };
  }

  return options?.requireHost
    ? requireTripHost(request, seed)
    : requireTripEdit(request, seed);
}
