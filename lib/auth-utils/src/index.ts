export { executeCaptcha, isRecaptchaLoaded } from "./captcha/index";
export { canonicalizePhone, formatPhoneForApi, isValidPhone } from "./phone";
export { decodeJwt, isTokenExpired } from "./jwt";
export type { JwtPayload } from "./jwt";
export {
  GoogleOAuthProvider,
  useGoogleLogin,
  useFacebookLogin,
  initFacebookSDK,
  loadGoogleGSIToken,
  loadFacebookAccessToken,
  decodeGoogleJwtPayload,
  type OAuthResult,
  type OAuthError,
} from "./oauth/index";
export { TwoFactorSetup, TwoFactorVerify } from "./two-factor/index";
export type { TwoFactorSetupProps, TwoFactorVerifyProps } from "./two-factor/types";
export { MagicLinkSender } from "./magic-link/index";
export type { MagicLinkSenderProps } from "./magic-link/types";
export { useAuthConfig, invalidateAuthConfigCache } from "./useAuthConfig";
export type { AuthConfig } from "./useAuthConfig";

// Permissions / RBAC catalog
export {
  PERMISSIONS,
  PERMISSION_IDS,
  DEFAULT_ROLE_PERMISSIONS,
  assertPermissionId,
  isPermissionId,
  permissionsByCategory,
  compactPermissions,
  hasPermission,
} from "./permissions";
export type {
  PermissionId,
  PermissionCategory,
  PermissionDef,
} from "./permissions";
