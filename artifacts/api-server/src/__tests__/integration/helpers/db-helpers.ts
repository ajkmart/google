/**
 * Integration test database helpers.
 * Direct DB access for seeding and cleanup — bypasses route handlers.
 */

import { db } from "@workspace/db";
import {
  usersTable,
  otpTokensTable,
  otpAttemptsTable,
  magicLinkTokensTable,
  platformSettingsTable,
  riderProfilesTable,
  vendorProfilesTable,
  refreshTokensTable,
} from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomInt } from "crypto";
import { hashOtpCode } from "../../../modules/otp/otp.generate.js";
import { saveOtpToken } from "../../../modules/otp/otp.store.js";
import type { OtpType, OtpIdentifierType } from "../../../modules/otp/otp.types.js";
import { canonicalizePhone } from "@workspace/phone-utils";

// ─── ID / AJK-ID generators ────────────────────────────────────────────────────

export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTestAjkId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "AJK-";
  for (let i = 0; i < 6; i++) id += chars.charAt(randomInt(0, chars.length));
  return id;
}

/**
 * Generate a unique Pakistani phone in raw `03XXXXXXXXX` format (11 digits total).
 * PHONE_REGEX = /^0?3\d{9}$/ — needs `03` + exactly 9 digits.
 */
export function generateTestPhone(): string {
  // 9-digit suffix: 100_000_000 – 999_999_999
  const suffix = String(randomInt(100000000, 999999999));
  return `03${suffix}`;
}

/**
 * Convert a raw Pakistani phone (`03XXXXXXXXX`) to canonical bare-digit form (`3XXXXXXXXX`).
 * `canonicalizePhone('03001234567')` → `'3001234567'`
 * Routes store users.phone and otp_tokens.identifier in this bare form.
 */
export function toCanonicalPhone(phone: string): string {
  return canonicalizePhone(phone);
}

/** Generate a unique test email for each test. */
export function generateTestEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@ajkmart-test.invalid`;
}

// ─── User Helpers ──────────────────────────────────────────────────────────────

export interface CreateUserOpts {
  id?: string;
  phone?: string;
  email?: string;
  name?: string;
  roles?: string;
  passwordHash?: string;
  isActive?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  phoneVerified?: boolean;
  emailVerified?: boolean;
  ajkId?: string;
}

export async function createTestUser(opts: CreateUserOpts = {}): Promise<string> {
  const id = opts.id ?? generateTestId();
  await db.insert(usersTable).values({
    id,
    phone: opts.phone ?? null,
    name: opts.name ?? "Test User",
    email: opts.email ?? null,
    roles: opts.roles ?? "customer",
    passwordHash: opts.passwordHash ?? "dummy_hash:dummy_salt",
    walletBalance: "0",
    isActive: opts.isActive ?? true,
    approvalStatus: opts.approvalStatus ?? "approved",
    phoneVerified: opts.phoneVerified ?? true,
    emailVerified: opts.emailVerified ?? false,
    ajkId: opts.ajkId ?? generateTestAjkId(),
  });
  return id;
}

export async function deleteTestUser(userId: string): Promise<void> {
  await db.delete(usersTable).where(eq(usersTable.id, userId));
}

export async function deleteTestUserByPhone(phone: string): Promise<void> {
  await db.delete(usersTable).where(eq(usersTable.phone, phone));
}

// ─── OTP Token Helpers ─────────────────────────────────────────────────────────

/** Seed a known OTP token directly into the DB, bypassing the delivery flow. */
export async function seedOtpToken(options: {
  identifier: string;
  identifierType: OtpIdentifierType;
  otpType: OtpType;
  code?: string;
  userId?: string;
  ttlMs?: number;
  expiredMs?: number;
}): Promise<{ tokenId: string; code: string }> {
  const {
    identifier,
    identifierType,
    otpType,
    code = "123456",
    userId,
    ttlMs,
    expiredMs,
  } = options;

  const otpHash = hashOtpCode(code);

  const overrideTtl = expiredMs !== undefined ? -expiredMs : ttlMs;

  const tokenId = await saveOtpToken({
    identifier,
    identifierType,
    otpType,
    otpHash,
    channel: identifierType === "phone" ? "sms" : "email",
    userId,
    ttlMs: overrideTtl ?? 5 * 60 * 1000,
  });

  return { tokenId, code };
}

/** Mark an OTP token as used (for replay-attack tests). */
export async function markOtpTokenUsed(tokenId: string): Promise<void> {
  await db
    .update(otpTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(otpTokensTable.id, tokenId));
}

/** Immediately expire an OTP token (for expiry tests). */
export async function expireOtpToken(tokenId: string): Promise<void> {
  await db
    .update(otpTokensTable)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(otpTokensTable.id, tokenId));
}

/** Clean up all OTP tokens for an identifier. */
export async function cleanupOtpTokens(identifier: string): Promise<void> {
  await db
    .delete(otpTokensTable)
    .where(eq(otpTokensTable.identifier, identifier));
}

/** Clean up all OTP attempt records for an identifier. */
export async function cleanupOtpAttempts(identifier: string): Promise<void> {
  await db
    .delete(otpAttemptsTable)
    .where(eq(otpAttemptsTable.key, identifier));
}

// ─── Magic Link Helpers ────────────────────────────────────────────────────────

export async function cleanupMagicLinkTokens(userId: string): Promise<void> {
  await db
    .delete(magicLinkTokensTable)
    .where(eq(magicLinkTokensTable.userId, userId));
}

// ─── Platform Settings Helpers ─────────────────────────────────────────────────

export async function seedPlatformSetting(
  key: string,
  value: string,
  label = "Test Setting",
  category = "auth",
): Promise<void> {
  await db
    .insert(platformSettingsTable)
    .values({ key, value, label, category })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function deletePlatformSetting(key: string): Promise<void> {
  await db.delete(platformSettingsTable).where(eq(platformSettingsTable.key, key));
}

// ─── Refresh Token Helpers ─────────────────────────────────────────────────────

export async function cleanupRefreshTokens(userId: string): Promise<void> {
  await db
    .delete(refreshTokensTable)
    .where(eq(refreshTokensTable.userId, userId));
}
