"use client";

/**
 * Client 端：保存目前旅程 seedCode 與綁定身份 memberId，
 * 並提供帶上存取憑證 header 的 fetch 包裝。
 */

export const SEED_HEADER = "x-plant-seed";
export const MEMBER_HEADER = "x-plant-member";

let activeSeed: string | null = null;
let activeMemberId: string | null = null;

function memberStorageKey(seed: string): string {
  return `plant-member-${seed.toUpperCase()}`;
}

export function setActiveSeed(seed: string | null) {
  activeSeed = seed ? seed.trim().toUpperCase() : null;
  if (activeSeed) {
    try {
      const stored = localStorage.getItem(memberStorageKey(activeSeed));
      activeMemberId = stored || null;
    } catch {
      activeMemberId = null;
    }
  } else {
    activeMemberId = null;
  }
}

export function getActiveSeed(): string | null {
  return activeSeed;
}

export function setActiveMemberId(memberId: string | null) {
  activeMemberId = memberId;
  if (!activeSeed) return;
  try {
    if (memberId) {
      localStorage.setItem(memberStorageKey(activeSeed), memberId);
    } else {
      localStorage.removeItem(memberStorageKey(activeSeed));
    }
  } catch {
    /* ignore */
  }
}

export function getActiveMemberId(): string | null {
  return activeMemberId;
}

export async function seededFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (activeSeed) headers.set(SEED_HEADER, activeSeed);
  if (activeMemberId) headers.set(MEMBER_HEADER, activeMemberId);
  return fetch(input, { ...init, headers });
}

/** 一般 mutation 也帶身份（不一定需要 seed header） */
export async function memberFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (activeMemberId) headers.set(MEMBER_HEADER, activeMemberId);
  return fetch(input, { ...init, headers });
}
