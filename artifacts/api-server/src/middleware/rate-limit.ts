/**
 * Tiered rate-limit middleware.
 *
 * All limiters are created through `createRateLimiter()` — a typed factory that:
 *   - Uses Redis (rate-limit-redis) for shared counters across instances when
 *     REDIS_URL is configured.  Note: rate-limit-redis uses a fixed-window
 *     algorithm (not sliding-window) — counters reset at the start of each
 *     window boundary rather than rolling forward continuously.  This is
 *     acceptable for auth rate-limiting; upgrade to a sorted-set Lua script
 *     if true sliding-window semantics are required in the future.
 *   - Falls back to express-rate-limit's built-in in-memory store when Redis is
 *     unavailable.  In multi-instance deployments this means per-instance counters;
 *     a startup warning is emitted so operators know to configure Redis.
 *   - Returns JSON 429 responses with `retryAfter` (seconds), `code`, and
 *     `tier`-adjusted human-readable messages — never raw "Too many requests".
 *   - Accepts a `tier` option ("strict" | "standard" | "lenient") that controls
 *     the 429 copy shown to the end-user.
 *
 * Tiers:
 *   globalLimiter           300 req / 15 min  — all /api traffic
 *   loginLimiter              5 req / 60 s   / IP            — POST /api/auth/login
 *   otpLimiter                3 req / 60 s   / phone (or IP) — OTP send/verify
 *   userApiLimiter          100 req / 60 s   / authenticated user ID
 *   authLimiter              20 req / 15 min  — OTP / login / social-auth (legacy guard)
 *   adminAuthLimiter         10 req / 15 min  — admin login & password-reset
 *   paymentLimiter           30 req / 15 min  — wallet & payment routes
 *   publicLimiter            60 req / 15 min  — public scraping-prone endpoints
 *   redeemLimiter             5 req / 15 min / user — POST /api/loyalty/redeem
 *   exportDataLimiter         3 req / 15 min / user — POST /api/users/export-data
 *   registerUploadLimiter    10 req / 60 min / IP  — POST /api/uploads/register (unauthenticated)
 */
import rateLimit, { type Options, type Store } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import type { Request, Response } from "express";

/**
 * Options for the `createRateLimiter` factory.
 */
export interface RateLimiterOptions {
  /** Redis key namespace — must be unique per limiter to prevent counter collisions. */
  prefix: string;
  /** Maximum number of requests allowed within `windowMs`. */
  max: number;
  /** Sliding-window duration in milliseconds. */
  windowMs: number;
  /**
   * Controls the user-visible message in 429 responses:
   * - "strict"   → "Too many attempts. Please wait before trying again."
   * - "standard" → "Too many requests. Please slow down."  (default)
   * - "lenient"  → "You're making requests too fast. Please wait a moment."
   */
  tier?: "strict" | "standard" | "lenient";
  /** Custom key generator. Defaults to client IP. */
  keyGenerator?: (req: Request, res: Response) => string;
  /** Any additional express-rate-limit options (e.g. `skip`, `skipSuccessfulRequests`). */
  extra?: Partial<Options>;
}

function makeStore(prefix: string): Store | undefined {
  if (!redisClient) return undefined;
  try {
    return new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args: string[]) => {
        /* Null-safe guard: if redisClient was cleared after store construction,
           return a rejected Promise so express-rate-limit handles it gracefully
           rather than crashing with a TypeError on null.call. */
        if (!redisClient) {
          return Promise.reject(new Error("[rate-limit] Redis client not available")) as ReturnType<import("rate-limit-redis").SendCommandFn>;
        }
        return (redisClient.call as (...a: string[]) => Promise<unknown>)(...args).catch((err: Error) => {
          if (!err.message.includes("closed")) {
            logger.error({ prefix, err: err.message }, "[rate-limit] Redis error");
          }
          throw err;
        }) as ReturnType<import("rate-limit-redis").SendCommandFn>;
      },
    });
  } catch (err) {
    logger.error({ prefix, err }, "[rate-limit] Could not create Redis store");
    return undefined;
  }
}

const TIER_MESSAGES: Record<NonNullable<RateLimiterOptions["tier"]>, string> = {
  strict:   "Too many attempts. Please wait before trying again.",
  standard: "Too many requests. Please slow down.",
  lenient:  "You're making requests too fast. Please wait a moment.",
};

/**
 * Factory for all AJKMart rate limiters.
 *
 * Uses a Redis-backed sliding-window store when REDIS_URL is available, with an
 * automatic in-memory fallback (plus a startup warning in multi-instance mode).
 * All 429 responses are JSON with `retryAfter` (seconds), `code: "RATE_LIMITED"`,
 * and a tier-appropriate human-readable message.
 *
 * @example
 * ```typescript
 * export const myLimiter = createRateLimiter({
 *   prefix: "my-endpoint",
 *   max: 5,
 *   windowMs: 60_000,
 *   tier: "strict",
 *   keyGenerator: (req) => req.body?.email ?? req.ip,
 * });
 * ```
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { prefix, max, windowMs, tier = "standard", keyGenerator, extra } = options;
  const store = makeStore(prefix);

  if (!store && process.env["MULTI_INSTANCE"] === "true") {
    logger.warn(
      { prefix },
      "[rate-limit] Redis unavailable in multi-instance mode — counters are per-instance and not shared across replicas",
    );
  }
  logger.info({ prefix, store: store ? "Redis" : "in-memory", tier }, "[rate-limit] limiter configured");

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: TIER_MESSAGES[tier],
        retryAfter: Math.ceil(windowMs / 1000),
        code: "RATE_LIMITED",
        tier,
      });
    },
    ...(keyGenerator ? { keyGenerator } : {}),
    ...extra,
  });
}

/** @deprecated Use `createRateLimiter()` instead. */
function makeOptions(prefix: string, max: number, windowMs: number, extra?: Partial<Options>): Partial<Options> {
  return {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: makeStore(prefix),
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: TIER_MESSAGES.standard,
        retryAfter: Math.ceil(windowMs / 1000),
        code: "RATE_LIMITED",
        tier: "standard",
      });
    },
    ...extra,
  };
}

const WINDOW_60_MIN = 60 * 60 * 1000;
const WINDOW_15_MIN = 15 * 60 * 1000;
const WINDOW_1_MIN  = 60 * 1000;

/* ── Shared key-generator helpers ────────────────────────────────────── */
const ipKey = (req: Request): string =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
  req.socket?.remoteAddress ||
  "unknown";

const userOrIpKey = (req: Request): string => {
  const uid = req.userId ?? req.customerId ?? req.riderId ?? req.vendorId;
  return uid ? `user:${uid}` : ipKey(req);
};

/* ── Broad traffic limiters ──────────────────────────────────────────── */

/** 300 req / 15 min — blanket guard for all /api traffic. */
export const globalLimiter = createRateLimiter({ prefix: "global", max: 300, windowMs: WINDOW_15_MIN });

/** 20 req / 15 min — legacy guard for OTP/login/social-auth routes (use specific limiters where possible). */
export const authLimiter = createRateLimiter({ prefix: "auth", max: 20, windowMs: WINDOW_15_MIN });

/** 10 req / 15 min — admin login and password-reset. */
export const adminAuthLimiter = createRateLimiter({ prefix: "admin-auth", max: 10, windowMs: WINDOW_15_MIN, tier: "strict" });

/** 30 req / 15 min — wallet and payment routes. */
export const paymentLimiter = createRateLimiter({ prefix: "payment", max: 30, windowMs: WINDOW_15_MIN });

/**
 * publicLimiter — 60 req / 15 min for public, scraping-prone endpoints.
 * Applied to banners, categories, products, promotions/public,
 * recommendations, public-vendors, and deep-links endpoints.
 */
export const publicLimiter = createRateLimiter({ prefix: "public", max: 60, windowMs: WINDOW_15_MIN });

/* ── Auth-specific tight limiters ────────────────────────────────────── */

/**
 * loginLimiter — 5 login attempts / 60 s / IP.
 * Apply to POST /api/auth/login and similar credential-checking endpoints.
 */
export const loginLimiter = createRateLimiter({
  prefix: "login", max: 5, windowMs: WINDOW_1_MIN, tier: "strict",
  keyGenerator: (req) => ipKey(req),
});

/**
 * otpLimiter — 3 OTP send/verify attempts / 60 s / phone (fallback to IP).
 * Apply to POST /api/auth/send-otp and POST /api/auth/verify-otp.
 */
export const otpLimiter = createRateLimiter({
  prefix: "otp", max: 3, windowMs: WINDOW_1_MIN, tier: "strict",
  keyGenerator: (req) => {
    const phone = req.body?.phone ?? req.body?.identifier;
    if (phone && typeof phone === "string" && phone.length > 0) {
      return `phone:${(phone as string).replace(/\s/g, "")}`;
    }
    return ipKey(req);
  },
});

/**
 * emailOtpLimiter — 5 email OTP send/verify attempts / 60 s / email (fallback to IP).
 * Apply to POST /api/auth/send-email-otp and POST /api/auth/verify-email-otp.
 */
export const emailOtpLimiter = createRateLimiter({
  prefix: "email-otp", max: 5, windowMs: WINDOW_1_MIN, tier: "strict",
  keyGenerator: (req) => {
    const email = req.body?.email ?? req.body?.identifier;
    if (email && typeof email === "string" && (email as string).includes("@")) {
      return `email:${(email as string).toLowerCase().trim()}`;
    }
    return ipKey(req);
  },
});

/**
 * magicLinkLimiter — 3 magic link requests / 15 min / email (fallback to IP).
 * Apply to POST /api/auth/magic-link/send to prevent spam.
 */
export const magicLinkLimiter = createRateLimiter({
  prefix: "magic-link", max: 3, windowMs: WINDOW_15_MIN, tier: "strict",
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email && typeof email === "string" && (email as string).includes("@")) {
      return `email:${(email as string).toLowerCase().trim()}`;
    }
    return ipKey(req);
  },
});

/**
 * registrationLimiter — 10 registration attempts / 60 min / IP.
 * Apply to POST /api/auth/register, /api/auth/email-register, /api/auth/vendor-register.
 */
export const registrationLimiter = createRateLimiter({
  prefix: "registration", max: 10, windowMs: WINDOW_60_MIN, tier: "standard",
  keyGenerator: (req) => ipKey(req),
});

/**
 * refreshTokenLimiter — 30 token refresh requests / 15 min / userId (fallback to IP).
 * Apply to POST /api/auth/refresh to prevent token-cycling abuse.
 */
export const refreshTokenLimiter = createRateLimiter({
  prefix: "refresh-token", max: 30, windowMs: WINDOW_15_MIN, tier: "lenient",
  keyGenerator: (req) => userOrIpKey(req),
});

/**
 * passwordResetLimiter — 5 password reset requests / 60 min / IP.
 * Apply to POST /api/auth/forgot-password to prevent account enumeration.
 */
export const passwordResetLimiter = createRateLimiter({
  prefix: "password-reset", max: 5, windowMs: WINDOW_60_MIN, tier: "strict",
  keyGenerator: (req) => ipKey(req),
});

/**
 * redeemLimiter — 5 redemptions / 15 min / authenticated user ID (fallback to IP).
 * Apply to POST /api/loyalty/redeem to prevent rapid point farming.
 */
export const redeemLimiter = createRateLimiter({
  prefix: "redeem", max: 5, windowMs: WINDOW_15_MIN, tier: "standard",
  keyGenerator: (req) => userOrIpKey(req),
});

/**
 * exportDataLimiter — 3 exports / 15 min / authenticated user ID (fallback to IP).
 * Apply to POST /api/users/export-data to prevent bulk personal data extraction.
 */
export const exportDataLimiter = createRateLimiter({
  prefix: "export-data", max: 3, windowMs: WINDOW_15_MIN, tier: "standard",
  keyGenerator: (req) => userOrIpKey(req),
});

/**
 * registerUploadLimiter — 10 uploads / 60 min / IP.
 * Apply to POST /api/uploads/register (unauthenticated pre-signup document upload).
 * Prevents storage/bandwidth exhaustion by anonymous callers.
 */
export const registerUploadLimiter = createRateLimiter({
  prefix: "register-upload", max: 10, windowMs: WINDOW_60_MIN, tier: "standard",
  keyGenerator: (req) => ipKey(req),
});

/**
 * userApiLimiter — 100 requests / 60 s / authenticated user ID (fallback to IP).
 * Apply to authenticated /api/* routes that should be throttled per-user.
 */
export const userApiLimiter = createRateLimiter({
  prefix: "user-api", max: 100, windowMs: WINDOW_1_MIN, tier: "lenient",
  keyGenerator: (req) => userOrIpKey(req),
  extra: { skip: (req: Request) => req.method === "OPTIONS" },
});
