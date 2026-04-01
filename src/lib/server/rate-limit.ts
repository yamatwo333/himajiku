import type { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment: (key: string, limit: number, windowMs: number) => RateLimitResult;
}

declare global {
  var __shareHimaRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

function getInMemoryStore() {
  if (!globalThis.__shareHimaRateLimitStore) {
    globalThis.__shareHimaRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.__shareHimaRateLimitStore;
}

function createInMemoryRateLimitStore(): RateLimitStore {
  return {
    increment(key, limit, windowMs) {
      const store = getInMemoryStore();
      const now = Date.now();
      const existing = store.get(key);

      if (!existing || existing.resetAt <= now) {
        const nextEntry = { count: 1, resetAt: now + windowMs };
        store.set(key, nextEntry);
        return {
          allowed: true,
          limit,
          remaining: Math.max(limit - 1, 0),
          resetAt: nextEntry.resetAt,
        };
      }

      existing.count += 1;
      store.set(key, existing);

      return {
        allowed: existing.count <= limit,
        limit,
        remaining: Math.max(limit - existing.count, 0),
        resetAt: existing.resetAt,
      };
    },
  };
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

export function getRateLimitKeyParts({
  request,
  userId,
}: {
  request: NextRequest;
  userId?: string | null;
}) {
  return {
    userId: userId || "guest",
    ip: getClientIp(request),
  };
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
  store = createInMemoryRateLimitStore(),
}: {
  key: string;
  limit: number;
  windowMs: number;
  store?: RateLimitStore;
}) {
  return store.increment(key, limit, windowMs);
}
