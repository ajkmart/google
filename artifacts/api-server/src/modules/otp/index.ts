/**
 * OTP Module — Public API
 *
 * Only import from this file in route controllers.
 * Internal module files (otp.store, otp.deliver, etc.) are private.
 *
 * Usage:
 *   import { sendOtp, verifyOtp, generateTripOtp, OTP_CONFIG } from "../../modules/otp/index.js";
 */

// ── Core functions ──
export { sendOtp, verifyOtp } from "./otp.verify.js";

// ── Trip OTP (ride verification) ──
export { generateTripOtp } from "./otp.generate.js";

// ── Config (for route-level TTL display etc.) ──
export { OTP_CONFIG } from "./otp.config.js";

// ── All types ──
export type {
  OtpChannel,
  OtpType,
  OtpIdentifierType,
  OtpSendOptions,
  OtpVerifyOptions,
  OtpSendResult,
  OtpVerifyResult,
  OtpAttemptStatus,
} from "./otp.types.js";

// ── Typed errors (for route-level catch blocks) ──
export {
  OtpDeliveryError,
  OtpRateLimitError,
  OtpBlockedError,
  OtpInvalidError,
  OtpExpiredError,
  OtpAlreadyUsedError,
} from "./otp.types.js";

// ── Channel availability (used by admin/settings) ──
export { getAvailableChannels } from "./otp.deliver.js";

// ── Cleanup (used by scheduler) ──
export { cleanupExpiredTokens } from "./otp.store.js";
