/** Server-side：解析 client 附帶的身份 header */
export const MEMBER_HEADER = "x-plant-member";

export function getMemberFromRequest(request: Request): string | null {
  const raw = request.headers.get(MEMBER_HEADER);
  if (!raw) return null;
  const id = raw.trim();
  return id.length > 0 ? id : null;
}
