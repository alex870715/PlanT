import { z } from "zod";

/** 共用：經緯度範圍 */
const latitude = z.number().finite().min(-90).max(90);
const longitude = z.number().finite().min(-180).max(180);

export const discoverCardSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  category: z.enum(["food", "spot"]).default("spot"),
  description: z.string().trim().max(500).default(""),
  popularity: z.number().finite().min(0).max(100).default(50),
  latitude,
  longitude,
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  area: z.string().trim().max(80).optional(),
  groupLikes: z.number().optional(),
  groupLabel: z.string().max(120).optional(),
});

export const plantTripBodySchema = z.object({
  destination: z.string().trim().min(1).max(80),
  title: z.string().trim().max(120).optional(),
  memberName: z.string().trim().max(40).optional(),
  days: z.number().int().min(1).max(30).optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  liked: z.array(discoverCardSchema).min(1).max(60),
});

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  paidByMemberId: z.string().trim().min(1).max(64),
  amount: z.number().finite().positive().max(100_000_000),
  splitMemberIds: z.array(z.string().trim().max(64)).max(50).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  currency: z.string().trim().length(3).optional(),
  exchangeRate: z.number().finite().positive().max(1_000_000).optional(),
});

export const createTripSchema = z.object({
  title: z.string().trim().min(1).max(120),
  startDate: z.string().trim().min(1).max(40),
  endDate: z.string().trim().min(1).max(40),
  memberName: z.string().trim().max(40).optional(),
});

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** 解析並驗證 request JSON body（型別取 schema 的 output） */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, error: "請求內容不是有效的 JSON" };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".");
    const msg = first?.message ?? "輸入格式錯誤";
    return { ok: false, error: path ? `${path}: ${msg}` : msg };
  }
  return { ok: true, data: result.data };
}
