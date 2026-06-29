"use client";

/**
 * Client 端：在記憶體保存目前開啟旅程的 seedCode，
 * 並提供帶上存取憑證 header 的 fetch 包裝，給 spot/member 變更類請求使用。
 */

export const SEED_HEADER = "x-plant-seed";

let activeSeed: string | null = null;

export function setActiveSeed(seed: string | null) {
  activeSeed = seed ? seed.trim().toUpperCase() : null;
}

export function getActiveSeed(): string | null {
  return activeSeed;
}

export async function seededFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (activeSeed) headers.set(SEED_HEADER, activeSeed);
  return fetch(input, { ...init, headers });
}
