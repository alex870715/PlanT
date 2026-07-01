"use client";

/**
 * Client 端：帶 seed header + session cookie 的 fetch 包裝。
 */

export const SEED_HEADER = "x-plant-seed";
export const MEMBER_HEADER = "x-plant-member";

export type TripRole = "viewer" | "member" | "host";

let activeSeed: string | null = null;
let activeMemberId: string | null = null;
let activeRole: TripRole = "viewer";

export function setActiveSeed(seed: string | null) {
  activeSeed = seed ? seed.trim().toUpperCase() : null;
  if (!activeSeed) {
    activeMemberId = null;
    activeRole = "viewer";
  }
}

export function getActiveSeed(): string | null {
  return activeSeed;
}

export function setActiveMemberId(memberId: string | null) {
  activeMemberId = memberId;
}

export function getActiveMemberId(): string | null {
  return activeMemberId;
}

export function setActiveRole(role: TripRole) {
  activeRole = role;
}

export function getActiveRole(): TripRole {
  return activeRole;
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  if (activeSeed) headers[SEED_HEADER] = activeSeed;
  if (activeMemberId) headers[MEMBER_HEADER] = activeMemberId;
  return headers;
}

export async function seededFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}

export async function memberFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  return seededFetch(input, init);
}

export type AuthStatus = {
  loggedIn: boolean;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  linkedMemberId: string | null;
  role: TripRole;
  canEdit: boolean;
  isHost: boolean;
  hostMemberId: string | null;
};

export async function fetchAuthStatus(
  seedCode: string
): Promise<AuthStatus | null> {
  const res = await seededFetch(`/api/trip/${seedCode}/auth/status`);
  if (!res.ok) return null;
  const data = (await res.json()) as AuthStatus;
  if (data.role) activeRole = data.role;
  if (data.linkedMemberId) activeMemberId = data.linkedMemberId;
  return data;
}

export function getViewLink(seedCode: string): string {
  if (typeof window === "undefined") return `/trip/${seedCode}`;
  return `${window.location.origin}/trip/${seedCode}`;
}

export function getLoginUrl(callbackPath?: string): string {
  const callback =
    callbackPath ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  return `/login?callbackUrl=${encodeURIComponent(callback)}`;
}
