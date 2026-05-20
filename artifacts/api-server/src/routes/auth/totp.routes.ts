/**
 * totp.routes.ts — Thin controller for TOTP / 2FA.
 *
 * All crypto delegated to otp.totp module.
 * Business rules (auth method enabled, session management) stay here.
 *
 * Routes (all are backward-compatible aliases retained):
 *   GET  /auth/2fa/setup
 *   POST /auth/2fa/verify-setup
 *   POST /auth/totp/setup          ← canonical alias
 *   POST /auth/totp/enable         ← canonical
 *   POST /auth/2fa/verify
 *   POST /auth/2fa/disable
 *   POST /auth/2fa/recovery
 *   POST /auth/totp/recover        ← canonical
 *   POST /auth/2fa/trust-device
 *   GET  /auth/2fa/status
 *   GET  /auth/totp/recovery-codes/count
 */

import { Router, type IRouter } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getClientIp,
  getCachedSettings,
  sign2faChallengeToken,
  verify2faChallengeToken,
  addSecurityEvent,
  writeAuthAuditLog,
} from "../../middleware/security.js";
import { isAuthMethodEnabled } from "@workspace/auth-utils/server";
import { validateBody } from "../../middleware/validate.js";
import {
  extractAuthUser,
  issueTokensForUser,
  isDeviceTrusted,
} from "./helpers.js";
import { consumeRecoveryCode } from "./auth-common.js";
import { logger } from "../../lib/logger.js";
import {
  sendError,
  sendErrorWithData,
  sendForbidden,
  sendNotFound,
  sendUnauthorized,
  sendSuccess,
} from "../../lib/response.js";
import {
  generateTotpSecret,
  verifyTotpToken,
  getTotpUri,
  generateQrCodeDataUrl,
  savePendingTotpSecret,
  getPendingTotpSecret,
  deletePendingTotpSecret,
  generateRecoveryCodes,
  countUnusedRecoveryCodes,
} from "../../modules/otp/index.js";
import { AuditService } from "../../services/admin-audit.service.js";

const router: IRouter = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const TotpCodeSchema     = z.object({ code: z.string().min(6).max(8) });
const TwoFaVerifySchema  = z.object({ tempToken: z.string(), code: z.string(), deviceFingerprint: z.string().optional() });
const TwoFaRecoverySchema = z.object({ tempToken: z.string(), backupCode: z.string() });
const TrustDeviceSchema  = z.object({ deviceFingerprint: z.string().min(8) });

// ─── GET /auth/2fa/setup ──────────────────────────────────────────────────────

router.get("/2fa/setup", async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const settings = await getCachedSettings();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication is currently disabled"); return;
    }
    if (user.totpEnabled) { sendError(res, "2FA is already enabled", 409); return; }

    const { secret, encryptedSecret } = generateTotpSecret();
    const label = user.email ?? user.phone ?? user.name ?? auth.userId;
    const uri   = getTotpUri(secret, label);

    await savePendingTotpSecret(auth.userId, encryptedSecret);

    let qrDataUrl: string | null = null;
    try { qrDataUrl = await generateQrCodeDataUrl(secret, label); } catch (e) {
      logger.error({ error: e instanceof Error ? e.message : String(e) }, "[totp/setup] QR code generation failed");
    }

    sendSuccess(res, { secret, uri, qrDataUrl });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] setup error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/totp/setup (canonical alias for GET /2fa/setup) ───────────────

router.post("/totp/setup", async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const settings = await getCachedSettings();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication is currently disabled"); return;
    }
    if (user.totpEnabled) { sendError(res, "2FA is already enabled", 409); return; }

    const { secret, encryptedSecret } = generateTotpSecret();
    const label = user.email ?? user.phone ?? user.name ?? auth.userId;
    const uri   = getTotpUri(secret, label);

    await savePendingTotpSecret(auth.userId, encryptedSecret);

    let qrDataUrl: string | null = null;
    try { qrDataUrl = await generateQrCodeDataUrl(secret, label); } catch (e) {
      logger.error({ error: e instanceof Error ? e.message : String(e) }, "[totp/setup] QR code generation failed");
    }

    sendSuccess(res, { secret, uri, qrDataUrl });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] setup error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/2fa/verify-setup (activate 2FA after first valid code) ────────

router.post("/2fa/verify-setup", validateBody(TotpCodeSchema), async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const settings = await getCachedSettings();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication is currently disabled"); return;
    }
    if (user.totpEnabled) { sendError(res, "2FA is already enabled", 409); return; }

    const pending = await getPendingTotpSecret(auth.userId);
    if (!pending) {
      sendError(res, "Please call /auth/2fa/setup first (setup session expired or not started)", 400); return;
    }

    if (!verifyTotpToken(req.body.code, pending.encryptedSecret)) {
      sendUnauthorized(res, "Invalid TOTP code. Please try again."); return;
    }

    await db.update(usersTable).set({ totpSecret: pending.encryptedSecret, updatedAt: new Date() }).where(eq(usersTable.id, auth.userId));
    await deletePendingTotpSecret(auth.userId);

    const { plainCodes: backupCodes } = await generateRecoveryCodes(auth.userId);

    await db.update(usersTable).set({ totpEnabled: true, backupCodes: null, updatedAt: new Date() }).where(eq(usersTable.id, auth.userId));

    const ip = getClientIp(req);
    writeAuthAuditLog("2fa_enabled", { userId: auth.userId, ip, userAgent: req.headers["user-agent"] as string });
    AuditService.log({ action: "2fa_enabled", ip, details: `2FA enabled for user ${auth.userId}`, result: "success" });

    sendSuccess(res, { success: true, backupCodes, message: "2FA activated. Save your backup codes securely — they cannot be shown again." });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] verify-setup error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/totp/enable (canonical alias for /2fa/verify-setup) ───────────

router.post("/totp/enable", validateBody(TotpCodeSchema), async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const settings = await getCachedSettings();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication is currently disabled"); return;
    }
    if (user.totpEnabled) { sendError(res, "2FA is already enabled", 409); return; }

    const pending = await getPendingTotpSecret(auth.userId);
    if (!pending) {
      sendError(res, "Please call /auth/2fa/setup first to obtain a TOTP secret (setup session expired or not started)", 400); return;
    }

    if (!verifyTotpToken(req.body.code, pending.encryptedSecret)) {
      sendUnauthorized(res, "Invalid TOTP code. Please try again."); return;
    }

    await db.update(usersTable).set({ totpSecret: pending.encryptedSecret, updatedAt: new Date() }).where(eq(usersTable.id, auth.userId));
    await deletePendingTotpSecret(auth.userId);

    const { plainCodes: backupCodes } = await generateRecoveryCodes(auth.userId);

    await db.update(usersTable).set({ totpEnabled: true, backupCodes: null, updatedAt: new Date() }).where(eq(usersTable.id, auth.userId));

    const ip = getClientIp(req);
    writeAuthAuditLog("2fa_enabled", { userId: auth.userId, ip, userAgent: req.headers["user-agent"] as string });
    AuditService.log({ action: "2fa_enabled", ip, details: `2FA enabled via /auth/totp/enable for user ${auth.userId}`, result: "success" });

    sendSuccess(res, { success: true, backupCodes, message: "2FA activated. Save your backup codes securely — they cannot be shown again." });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] enable error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/2fa/verify (verify TOTP during login challenge) ───────────────

router.post("/2fa/verify", validateBody(TwoFaVerifySchema), async (req, res) => {
  try {
    const { tempToken, code, deviceFingerprint } = req.body;
    if (!tempToken || !code) { sendError(res, "tempToken and code required", 400); return; }

    const challengePayload = verify2faChallengeToken(tempToken);
    if (!challengePayload) { sendUnauthorized(res, "Invalid or expired 2FA challenge token"); return; }

    const settings = await getCachedSettings();
    const ip       = getClientIp(req);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, challengePayload.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication has been disabled by admin."); return;
    }
    if (!user.totpEnabled || !user.totpSecret) { sendError(res, "2FA is not enabled", 400); return; }

    if (!verifyTotpToken(code, user.totpSecret)) {
      addSecurityEvent({ type: "2fa_verify_failed", ip, userId: user.id, details: "Invalid 2FA code on login", severity: "medium" });
      sendUnauthorized(res, "Invalid 2FA code"); return;
    }

    writeAuthAuditLog("2fa_verified", { userId: user.id, ip, userAgent: req.headers["user-agent"] as string });
    const originalMethod = challengePayload.authMethod ?? "phone_otp";
    const result = await issueTokensForUser(user, ip, originalMethod, req.headers["user-agent"] as string | undefined, req, res);
    sendSuccess(res, result);
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] 2fa/verify error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/2fa/disable ───────────────────────────────────────────────────

router.post("/2fa/disable", validateBody(TotpCodeSchema), async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const settings = await getCachedSettings();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication has been disabled by admin."); return;
    }
    if (!user.totpEnabled || !user.totpSecret) { sendError(res, "2FA is not enabled", 400); return; }

    if (!verifyTotpToken(req.body.code, user.totpSecret)) {
      sendUnauthorized(res, "Invalid TOTP code"); return;
    }

    await db.update(usersTable).set({
      totpEnabled: false, totpSecret: null, backupCodes: null, trustedDevices: null, updatedAt: new Date(),
    }).where(eq(usersTable.id, auth.userId));

    const ip = getClientIp(req);
    writeAuthAuditLog("2fa_disabled", { userId: auth.userId, ip, userAgent: req.headers["user-agent"] as string });
    AuditService.log({ action: "2fa_disabled", ip, details: `2FA disabled by user ${auth.userId}`, result: "success" });

    sendSuccess(res, undefined, "Two-factor authentication has been disabled");
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] disable error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/2fa/recovery — consume backup code + issue session ────────────

router.post("/2fa/recovery", validateBody(TwoFaRecoverySchema), async (req, res) => {
  try {
    const { tempToken, backupCode } = req.body;
    if (!tempToken || !backupCode) { sendError(res, "tempToken and backupCode required", 400); return; }

    const challengePayload = verify2faChallengeToken(tempToken);
    if (!challengePayload) { sendUnauthorized(res, "Invalid or expired 2FA challenge token"); return; }

    const ip       = getClientIp(req);
    const settings = await getCachedSettings();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, challengePayload.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication has been disabled by admin."); return;
    }
    if (!user.totpEnabled) { sendError(res, "2FA is not enabled", 400); return; }

    const outcome = await consumeRecoveryCode(user, backupCode, ip, "/auth/2fa/recovery");
    if ("error" in outcome) { sendError(res, outcome.error, outcome.status); return; }

    const method = challengePayload.authMethod ?? "phone_otp";
    const result = await issueTokensForUser(user, ip, method, req.headers["user-agent"] as string | undefined, req, res);
    sendSuccess(res, { ...result, codesRemaining: outcome.codesRemaining });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] recovery error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/totp/recover (canonical alias) ────────────────────────────────

router.post("/totp/recover", validateBody(TwoFaRecoverySchema), async (req, res) => {
  try {
    const { tempToken, backupCode } = req.body;
    if (!tempToken || !backupCode) { sendError(res, "tempToken and backupCode required", 400); return; }

    const challengePayload = verify2faChallengeToken(tempToken);
    if (!challengePayload) { sendUnauthorized(res, "Invalid or expired 2FA challenge token"); return; }

    const ip       = getClientIp(req);
    const settings = await getCachedSettings();

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, challengePayload.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication has been disabled by admin."); return;
    }
    if (!user.totpEnabled) { sendError(res, "2FA is not enabled", 400); return; }

    const outcome = await consumeRecoveryCode(user, backupCode, ip, "/auth/totp/recover");
    if ("error" in outcome) { sendError(res, outcome.error, outcome.status); return; }

    const method = challengePayload.authMethod ?? "phone_otp";
    const result = await issueTokensForUser(user, ip, method, req.headers["user-agent"] as string | undefined, req, res);
    sendSuccess(res, { ...result, codesRemaining: outcome.codesRemaining });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] totp/recover error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── POST /auth/2fa/trust-device ─────────────────────────────────────────────

router.post("/2fa/trust-device", validateBody(TrustDeviceSchema), async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const settings = await getCachedSettings();
    const trustedDays = parseInt(settings["auth_trusted_device_days"] ?? "30", 10);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
    if (!user) { sendNotFound(res, "User not found"); return; }

    if (!isAuthMethodEnabled(settings, "auth_2fa_enabled", user.roles ?? undefined)) {
      sendForbidden(res, "Two-factor authentication has been disabled by admin."); return;
    }
    if (!user.totpEnabled) { sendError(res, "2FA is not enabled", 400); return; }

    const { deviceFingerprint } = req.body;
    let devices: Array<{ fp: string; expiresAt: number }> = [];
    try { if (user.trustedDevices) devices = JSON.parse(user.trustedDevices); } catch (e) {
      logger.warn({ userId: user.id }, "[totp] trustedDevices JSON.parse failed — resetting");
    }

    const now = Date.now();
    devices = devices.filter(d => d.expiresAt > now && d.fp !== deviceFingerprint);
    devices.push({ fp: deviceFingerprint, expiresAt: now + trustedDays * 24 * 60 * 60 * 1000 });
    if (devices.length > 10) devices = devices.slice(-10);

    await db.update(usersTable).set({ trustedDevices: JSON.stringify(devices), updatedAt: new Date() }).where(eq(usersTable.id, auth.userId));

    const ip = getClientIp(req);
    writeAuthAuditLog("device_trusted", { userId: auth.userId, ip, userAgent: req.headers["user-agent"] as string });

    sendSuccess(res, { success: true, message: `Device trusted for ${trustedDays} days`, trustedDevices: devices.length });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] trust-device error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── GET /auth/2fa/status ─────────────────────────────────────────────────────

router.get("/2fa/status", async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const [user] = await db
      .select({ totpEnabled: usersTable.totpEnabled, trustedDevices: usersTable.trustedDevices })
      .from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);

    if (!user) { sendNotFound(res, "User not found"); return; }

    let deviceCount = 0;
    try { if (user.trustedDevices) deviceCount = JSON.parse(user.trustedDevices).length; } catch (_) {}

    sendSuccess(res, { totpEnabled: user.totpEnabled ?? false, trustedDeviceCount: deviceCount });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] status error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ─── GET /auth/totp/recovery-codes/count ─────────────────────────────────────

router.get("/totp/recovery-codes/count", async (req, res) => {
  try {
    const auth = extractAuthUser(req);
    if (!auth) { sendUnauthorized(res, "Authentication required"); return; }

    const count = await countUnusedRecoveryCodes(auth.userId);
    sendSuccess(res, { count, low: count <= 2 });
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, "[totp] recovery-codes/count error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
