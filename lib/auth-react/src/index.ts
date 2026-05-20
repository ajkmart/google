export const version = '0.0.1';

// AuthProvider & context
export { AuthProvider, useAuthContext, AuthContext } from './AuthProvider';
export type { AuthContextValue, AuthProviderProps, AuthUser } from './AuthProvider';

// Token storage
export { createTokenStorage, createNativeTokenStorage, getTokenStorage, SecureStorage } from './api/tokenStorage';
export type { TokenStorage, StorageType } from './api/tokenStorage';

// Auth client
export { createAuthClient } from './api/authClient';
export type { AuthClientOptions } from './api/authClient';

// JWT utilities
export { decodeJwt, isTokenExpired, getTokenExpiryRemaining } from './utils/jwtUtils';
export type { JwtPayload } from './utils/jwtUtils';

// Device fingerprint
export { getDeviceFingerprint } from './utils/deviceFingerprint';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useTokenRefresh } from './hooks/useTokenRefresh';
export type { UseTokenRefreshOptions } from './hooks/useTokenRefresh';
export { useLoginFlow } from './hooks/useLoginFlow';
export type { UseLoginFlowOptions, LoginMethod, IdentifierCheckResult } from './hooks/useLoginFlow';
export { useSessionManager } from './hooks/useSessionManager';
export type {
  UseSessionManagerOptions,
  UseSessionManagerResult,
  Session,
  LoginHistoryEntry,
} from './hooks/useSessionManager';

// Components
export { OtpInput, OtpTimer } from './components/OtpInput';
export type { OtpInputProps, OtpTimerProps } from './components/OtpInput';
export { PhoneInput } from './components/PhoneInput';
export type { PhoneInputProps, Country } from './components/PhoneInput';
export { PasswordInput } from './components/PasswordInput';
export type { PasswordInputProps, PasswordStrength } from './components/PasswordInput';
export { SocialButtons } from './components/SocialButtons';
export type { SocialButtonsProps } from './components/SocialButtons';
export { SocialLoginButtons } from './components/SocialLoginButtons';
export type { SocialLoginButtonsProps } from './components/SocialLoginButtons';
export { BiometricPrompt } from './components/BiometricPrompt';
export type { BiometricPromptProps } from './components/BiometricPrompt';
export { LoginCard } from './components/LoginCard';
export type { LoginCardProps } from './components/LoginCard';
export { MethodSelector } from './components/MethodSelector';
export type { MethodSelectorItem, MethodSelectorProps, LoginMethod } from './components/MethodSelector';
export { ApprovalOverlay } from './components/ApprovalOverlay';
export type { ApprovalOverlayProps } from './components/ApprovalOverlay';
export { SessionExpiredOverlay } from './components/SessionExpiredOverlay';
export type { SessionExpiredOverlayProps } from './components/SessionExpiredOverlay';
export { WrongAppScreen } from './components/WrongAppScreen';
export type { WrongAppScreenProps } from './components/WrongAppScreen';
export { LoginScreen } from './components/LoginScreen';
export type { LoginScreenProps, AppRole, CustomField, LoginScreenStrings } from './components/LoginScreen';
export { RegisterScreen } from './components/RegisterScreen';
export type { RegisterScreenProps, RegisterRole, FieldConfig, StepConfig, StepComponentProps } from './components/RegisterScreen';
export { SessionManagerScreen } from './components/SessionManagerScreen';
export type { SessionManagerScreenProps } from './components/SessionManagerScreen';

// Theme context — inject per-app brand colors into auth components
export { ThemeProvider, useAuthTheme, DEFAULT_THEMES, ThemeContext } from './context/ThemeContext';
export type { AuthTheme, ThemeProviderProps } from './context/ThemeContext';

// Rate-limit countdown hook
export { useRateLimitCountdown } from './hooks/useRateLimitCountdown';
export type { RateLimitCountdown } from './hooks/useRateLimitCountdown';

// Device metadata capture
export { captureDeviceMeta } from './lib/deviceMeta';
export type { DeviceMeta } from './lib/deviceMeta';
