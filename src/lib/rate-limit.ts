/**
 * 極簡記憶體 fixed-window rate limiter。
 * 注意：serverless 多實例下非全域精準，僅作基本濫用防護。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: existing.resetAt - now,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: options.limit - existing.count,
    retryAfterMs: 0,
  };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** 偶爾清理過期 bucket，避免記憶體無限成長 */
let lastSweep = 0;
export function sweepRateLimitBuckets() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}
