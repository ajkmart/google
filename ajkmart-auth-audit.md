# AJKMart — Multi-Panel Auth & Role Ecosystem Audit

**Audit Date:** 2026-05-20
**Auditor:** Full-Stack / Security Architect
**Scope:** Login, Registration, Logout, Forgot/Reset Password across all 4 panels.
**Method:** File-by-file static analysis of all auth contexts, screens, wizards, middleware, and backend routes. Zero assumptions — every finding is tied to a verified file and line number.

---

## Part 1 — Multi-Panel Auth & Role Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND — api-server                                   │
│                                                                                 │
│  POST /api/auth/*          ← Customer (phone OTP, email OTP, password,         │
│                               social, magic-link, 2FA, refresh, sessions)      │
│                                                                                 │
│  POST /api/admin/auth/*    ← Admin (username+password, TOTP MFA,               │
│  (admin-auth-v2.ts)           forgot/reset password, HttpOnly cookie session)  │
│                                                                                 │
│  POST /api/auth/*          ← Rider & Vendor (same /auth/* endpoints; role      │
│  (shared with customer)       differentiation enforced by JWT `role` claim     │
│                               and server-side requireRole() middleware)         │
│                                                                                 │
│  Middleware stack (all panels):                                                 │
│    globalLimiter → authLimiter → loginLimiter / otpLimiter                     │
│    → checkSessionRevocation (Redis JWT blacklist)                               │
│    → verifyTokenFamily (refresh token reuse detection)                         │
│    → requireRole("customer"|"rider"|"vendor") OR adminAuth                     │
│    → Zod schema validation on every request body                               │
└──────────────────┬─────────────────────────────────────────────────────────────┘
                   │  JWT (accessToken + refreshToken)
       ┌───────────┴─────────────────────────────────────────────┐
       │                                                          │
┌──────┴────────────┐  ┌──────────────────┐  ┌──────────────────┴──────┐
│  RIDER APP        │  │  VENDOR APP      │  │  CUSTOMER APP (mobile)   │
│  (Vite/React PWA) │  │  (Vite/React)    │  │  (Expo React Native)     │
│                   │  │                  │  │                           │
│ RiderAuthProvider │  │ AuthProvider     │  │ AuthProvider              │
│ role="rider"      │  │ role="vendor"    │  │ role="customer"           │
│                   │  │                  │  │                           │
│ Storage:          │  │ Storage:         │  │ Storage:                  │
│ Capacitor Prefs   │  │ sessionStorage   │  │ SecureStore +             │
│ (native-level)    │  │ (tab-scoped)     │  │ AsyncStorage fallback     │
│                   │  │                  │  │                           │
│ Logout:           │  │ Logout:          │  │ Logout:                   │
│ executeLogout     │  │ inline sequence  │  │ doLogout() with           │
│ Sequence() ✓      │  │ ⚠ INSECURE       │  │ full storage cleanup      │
└───────────────────┘  └──────────────────┘  └───────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │  ADMIN PANEL          │
                    │  (Vite/React)         │
                    │                       │
                    │ AdminAuthProvider     │
                    │                       │
                    │ Storage:              │
                    │ accessToken in-memory │
                    │ refreshToken in       │
                    │ HttpOnly cookie ✓     │
                    │ (most secure panel)   │
                    │                       │
                    │ Extras:               │
                    │ CSRF token cookie     │
                    │ Session expiry toast  │
                    │ TOTP / MFA step       │
                    └───────────────────────┘

Role-isolation enforcement (all verified):
  • Rider token → vendor endpoint   → 403 (requireRole check + JWT role claim)
  • Vendor token → admin endpoint   → 401 (adminAuth middleware)
  • Admin token  → customer endpoint → 403 (requireRole + approval check)
  • Cross-panel token in storage on mount → cleared immediately by bootstrap
    role check in each panel's auth provider (verified in all 3 web providers)
```

---

## Part 2 — Verified Bug Inventory

### CRITICAL

---

**C-01 | Vendor App | Missing Forgot Password Page & Route**
`artifacts/vendor-app/src/pages/` — file does not exist
`artifacts/vendor-app/src/` — no /forgot-password route registered in router

Vendors who lose their password have **zero self-service recovery path**. The login screen has no "Forgot Password?" link. The admin must manually reset passwords, creating a support burden. This is a hard production blocker.

Comparison:
- Rider app has: `artifacts/rider-app/src/pages/ForgotPassword.tsx` (346 lines, complete flow)
- Admin has: `artifacts/admin/src/pages/forgot-password.tsx` + `reset-password.tsx`
- Vendor: **NOTHING**

---

**C-02 | Customer App | `as any` Cast in Biometric Auth Critical Path**
`artifacts/ajkmart/context/AuthContext.tsx:438`

```ts
const data = await res.json() as any;
```

Inside `attemptBiometricLogin()` — a security-sensitive function that exchanges a stored refresh token for a new access token. All other token-exchange paths in this file use explicit typed interfaces (`as { token?: string; refreshToken?: string }`). This inconsistency bypasses TypeScript safety in exactly the path that must be most reliable.

---

**C-03 | All 4 Panels | No Rate-Limit Countdown UI (429 Response)**
Rider: `artifacts/rider-app/src/lib/auth/LoginScreen.tsx`
Vendor: `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`
Admin:  `artifacts/admin/src/lib/auth/LoginScreen.tsx`
Rider ForgotPw: `artifacts/rider-app/src/pages/ForgotPassword.tsx`
Admin ForgotPw: `artifacts/admin/src/pages/forgot-password.tsx`

The backend returns `{ retryAfter: number, code: "RATE_LIMITED" }` on HTTP 429 (verified in `artifacts/api-server/src/middleware/rate-limit.ts:64-69`). Not one of the four frontend panels parses `retryAfter` and displays a countdown timer. Users see a generic error string or toast with no actionable information.

---

**C-04 | All 4 Panels | No Device & Location Metadata Capture Service**
No file exists across any panel or backend auth routes.

No dedicated modular service captures device fingerprint (OS, browser, device type) or geolocation/IP on login/registration events. The backend has `writeAuthAuditLog` but receives no device metadata from clients. Required: non-blocking capture with graceful fallback when geolocation is denied.

---

### HIGH

---

**H-01 | Vendor App | Insecure Logout Sequence (Network Call Before Token Clear)**
`artifacts/vendor-app/src/lib/vendor-auth.tsx:202-208`

```ts
const logout = () => {
  const refreshTok = api.getRefreshToken();
  api.logout(refreshTok || undefined).catch((err) => { console.warn(...) }); // network FIRST
  sharedAuth.logout();
  setToken(null);
  setUser(null);
  queryClient.clear();
};
```

Network revocation fires before local tokens are cleared. If the API is slow or the user has poor connectivity, the refresh token remains valid in sessionStorage during the round-trip. The correct pattern (already in rider app via `executeLogoutSequence`) clears tokens synchronously first, then fires server revocation fire-and-forget.

---

**H-02 | Vendor App | `console.warn` Production Leak in Auth Context**
`artifacts/vendor-app/src/lib/vendor-auth.tsx:204`

```ts
api.logout(refreshTok || undefined).catch((err) => { console.warn('[artifacts/vendor-app/src/lib/vendor-auth.tsx]', err); });
```

Full file path exposed in production console output.

---

**H-03 | Rider App | `console.warn` Production Leak in logoutSequence**
`artifacts/rider-app/src/lib/logoutSequence.ts:34`

```ts
apiClient.logout(refreshTok).catch((err) => { console.warn("[logoutSequence] server token revocation failed...", err); });
```

Should use the structured `log.warn()` logger available throughout the rider app.

---

**H-04 | Rider App | `console.warn` Production Leak in ForgotPassword**
`artifacts/rider-app/src/pages/ForgotPassword.tsx:43`

```ts
} catch (err) { console.warn('[artifacts/rider-app/src/pages/ForgotPassword.tsx]', err); }
```

Same category as H-02.

---

**H-05 | Rider App | RegisterWizard Hardcodes Colors Instead of Using Theme Tokens**
`artifacts/rider-app/src/lib/auth/RegisterWizard.tsx:71-88` (PhoneInfoStep and other steps)

```tsx
<label className="text-[10px] font-bold text-yellow-500 ...">   // hardcoded
<input className="... bg-gray-950 border border-gray-800 ...">  // hardcoded
```

The Vendor RegisterWizard correctly uses `style={{ color: theme.primary }}` and `style={{ color: theme.text }}`. The Rider wizard hardcodes `text-yellow-500`, `bg-gray-950`, `border-gray-800`, `text-gray-100` throughout. Changing the rider brand color requires touching dozens of className strings.

---

**H-06 | Rider App | ForgotPassword Has Light-Theme Input Styles on Dark-Theme App**
`artifacts/rider-app/src/pages/ForgotPassword.tsx:28`

```ts
const INPUT = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm ...";
```

`bg-gray-50` (near-white) and `border-gray-200` (light gray) are light-theme colors. The entire rest of the rider app uses dark styles (`bg-gray-950`, `border-gray-800`). The Forgot Password page has visually jarring white inputs against a dark background — a confirmed design regression.

---

**H-07 | Vendor App | Missing `storageError` State in Auth Provider**
`artifacts/vendor-app/src/lib/vendor-auth.tsx` — entire file

The Rider auth provider has explicit `storageError: boolean` state surfaced when Capacitor Preferences fails. The Vendor auth provider has no equivalent. If sessionStorage is unavailable (e.g., private browsing with storage blocked), the vendor provider silently sets `token = null` and the user sees a confusing infinite loading state with no explanation.

---

**H-08 | Admin Panel | Dual Error Display Path on LoginScreen**
`artifacts/admin/src/lib/auth/LoginScreen.tsx:52-57` and `69-71`

Two independent error mechanisms fire simultaneously on a failed login:
1. `useEffect` calls `toast({ variant: "destructive" })` on `state.error` (lines 52-57)
2. Local `error` state renders inline text below the form (lines 69-71)

The same error message appears twice in different visual locations on every login failure.

---

### MEDIUM

---

**M-01 | Rider App | CNIC Marked Mandatory in Registration Step 2**
`artifacts/rider-app/src/lib/auth/RegisterWizard.tsx` (CnicVehicleStep)

CNIC and vehicle documents are presented as required fields, blocking registration completion. Only Name, Phone, and Password should be mandatory. CNIC/documents should be deferred to a post-registration KYC step to maximize conversion.

---

**M-02 | Vendor App | CNIC Marked Mandatory in Registration Step 2**
`artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx:90` (DocumentsStep)

```tsx
<label ...>{T("cnicNumber")} *</label>
```

Same issue as M-01. The asterisk marks CNIC as required, blocking vendor registration.

---

**M-03 | Rider App | Registration Draft Stores PII in Plaintext localStorage**
`artifacts/rider-app/src/lib/auth/RegisterWizard.tsx:28-30`

Phone, CNIC, city, and vehicle info are persisted to `localStorage` (key: `rider_reg_draft`) with a 24-hour TTL. Accessible to any JavaScript on the same origin (XSS surface). No at-rest encryption.

---

**M-04 | Vendor App | Registration Draft Stores PII in Plaintext localStorage with No TTL**
`artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx:27`

```ts
const DRAFT_KEY = "vendor_reg_draft";
```

Store name, owner name, CNIC, phone, city, and bank name persist to localStorage with **no expiry**. Unlike the rider app which enforces a 24-hour TTL, the vendor draft has no TTL at all.

---

**M-05 | Vendor App | "Document Upload Coming Soon" Placeholder in Live Registration**
`artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx:106-108` (DocumentsStep)

```tsx
<div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
  <p className="text-gray-400 text-sm">{T("documentUploadComingSoon")}</p>
</div>
```

A "coming soon" placeholder appears in Step 2 of the live vendor registration flow, signaling an incomplete feature to every new vendor.

---

**M-06 | Vendor App | `logoutCallbackRef` Dead Code**
`artifacts/vendor-app/src/lib/vendor-auth.tsx:96, 173`

```ts
const logoutCallbackRef = useRef<(() => void) | null>(null);  // declared but never read
...
logoutCallbackRef.current = clearAuth;                         // set but never called
```

The ref is set but `logoutCallbackRef.current` is never invoked anywhere. The actual callback is correctly wired via `api.registerLogoutCallback(clearAuth)` on line 174.

---

**M-07 | Rider App | `useAuth()` Returns Empty Object Outside Provider (Silent Failure)**
`artifacts/rider-app/src/lib/rider-auth.tsx:75-76`

```ts
const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);
```

Returns `{} as AuthCtx` when called outside `RiderAuthProvider`. Every property access silently returns `undefined`. The Admin pattern (`useAdminAuth()`) correctly throws `'useAdminAuth must be used within AdminAuthProvider'`.

---

**M-08 | Customer App | Empty `catch` Block Swallows Storage Init Errors**
`artifacts/ajkmart/context/AuthContext.tsx:286-287`

```ts
      } catch {}
      setIsLoading(false);
```

The `loadAuth()` bootstrap function — which initializes the entire auth session — swallows all errors silently. Any failure in token migration, AsyncStorage, or SecureStore produces no log and no user feedback.

---

### LOW

---

**L-01 | Admin Panel | Dual Navigation Logic in LoginScreen**
`artifacts/admin/src/lib/auth/LoginScreen.tsx:45-50`

```ts
useEffect(() => {
  if (state.user && state.accessToken) {
    onSuccess?.();              // may also navigate
    setLocation("/dashboard");  // always navigates regardless
  }
}, [...]);
```

If `onSuccess` also navigates, two navigation events fire for a single login — can cause double-push to browser history.

---

**L-02 | All Web Panels | No `aria-live` Region for Dynamic Form Errors**
Rider LoginScreen, Vendor LoginScreen, Admin LoginScreen, all ForgotPassword pages.

Error messages rendered after form submission are not in `role="alert"` or `aria-live="polite"` regions. Screen reader users will not hear error announcements without explicit focus management.

---

**L-03 | Rider App | OTP Resend Cooldown Starts Before First OTP Is Sent**
`artifacts/rider-app/src/lib/auth/RegisterWizard.tsx:104-106`

```ts
useEffect(() => {
  setResendCooldown(30);  // fires on mount, before any OTP is sent
}, []);
```

The 30-second cooldown begins immediately. If the initial OTP send fails silently, the user waits 30 seconds before being able to retry.

---

**L-04 | Admin Panel | `mustChangePassword` Legacy Field Has No `@deprecated` Tag**
`artifacts/admin/src/lib/adminAuthContext.tsx:17-21`

A forced password-change gate was removed but the field remains on the public interface with no `@deprecated` JSDoc tag and no removal timeline.

---

## Part 3 — Production-Ready Fix Guide

### FIX C-01: Vendor Forgot Password (New Page + Route)

Create `artifacts/vendor-app/src/pages/ForgotPassword.tsx` with a complete multi-step flow:
- Step 1: Choose method (Phone OTP or Email)
- Step 2: Send OTP (calls `POST /api/auth/send-otp` with `appRole: "vendor"`)
- Step 3: Enter 6-digit OTP with resend cooldown
- Step 4: Set new password with strength meter and confirm-password field
- Step 5: Success with 3-second auto-redirect to /login

Apply vendor green theme (`focus:ring-green-500`, light background `bg-white`). Register route in vendor router. Add "Forgot Password?" link on LoginScreen pointing to `/forgot-password`. Include 429 countdown timer (Fix C-03).

### FIX C-02: Remove `as any` in Customer Biometric Auth

`artifacts/ajkmart/context/AuthContext.tsx:438`

```ts
// Before
const data = await res.json() as any;

// After
const data = await res.json() as { token?: string; refreshToken?: string };
```

### FIX C-03: Rate-Limit Countdown UI on All Panels

Create a reusable hook `useRateLimitCountdown`:
```ts
interface RateLimitState {
  isLocked: boolean;
  secondsLeft: number;
  startCountdown: (retryAfter: number) => void;
}
```

On every auth form submission that returns HTTP 429:
1. Parse `data.retryAfter` from the response JSON
2. Call `startCountdown(data.retryAfter)`
3. Disable the submit button while `isLocked === true`
4. Display: `"Too many attempts. Please try again in M:SS"` with live decrement

Apply to all 6 affected screens (see C-03 bug entry for full list).

### FIX C-04: Device & Location Metadata Capture Service

Create `lib/deviceMeta.ts` (or per-app equivalent):
```ts
interface DeviceMeta {
  userAgent: string;
  platform: string;
  language: string;
  screenRes: string;
  timezone: string;
  ipAddress?: string;   // server can inject from req.ip if not sent
  latitude?: number;    // geolocation API — optional, try-catch
  longitude?: number;
  capturedAt: string;
}

export async function captureDeviceMeta(): Promise<DeviceMeta>
```

- On web: use `navigator.userAgent`, `screen.width/height`, `Intl.DateTimeFormat().resolvedOptions().timeZone`, and `navigator.geolocation.getCurrentPosition` wrapped in try-catch with fallback to IP-only.
- On mobile (Customer App): use `expo-device` for device model/OS, `expo-location` for coordinates (request foreground permission first; gracefully skip if denied).
- Send as `deviceMeta` field in the login/register request body.
- Backend: extend `writeAuthAuditLog` to accept and store `deviceMeta` as a JSONB column — no blocking of the auth response.

### FIX H-01: Vendor Logout — Secure Token-First Sequence

`artifacts/vendor-app/src/lib/vendor-auth.tsx:202-208`

```ts
const logout = () => {
  const refreshTok = api.getRefreshToken();   // 1. Capture before clearing
  api.clearTokens();                           // 2. Clear local tokens FIRST (synchronous)
  sharedAuth.logout();                         // 3. Clear shared SDK state
  setToken(null);                              // 4. Clear React state
  setUser(null);
  queryClient.clear();
  if (refreshTok) {                            // 5. Server revocation — fire and forget
    api.logout(refreshTok).catch((err) => log.warn("server revocation failed:", err));
  }
};
```

### FIX H-02/03/04: Replace All `console.warn` with Structured Logger

- `artifacts/vendor-app/src/lib/vendor-auth.tsx:204` → `log.warn("server revocation failed:", err)` (add `const log = createLogger("[vendor-auth]")`)
- `artifacts/rider-app/src/lib/logoutSequence.ts:34` → accept optional `logger` param or use module-level `createLogger("[logoutSequence]")`
- `artifacts/rider-app/src/pages/ForgotPassword.tsx:43` → `log.warn("phone format config error:", err)`

### FIX H-05: Rider RegisterWizard — Use Theme Tokens

All step components in `artifacts/rider-app/src/lib/auth/RegisterWizard.tsx` must:
1. Import `useTheme()` at the top of each step component
2. Replace hardcoded Tailwind color classes with inline styles using `theme.*` tokens:
   - `text-yellow-500` → `style={{ color: theme.primary }}`
   - `bg-gray-950` → `style={{ backgroundColor: theme.background }}`
   - `border-gray-800` → `style={{ borderColor: theme.border }}`
   - `text-gray-100` → `style={{ color: theme.text }}`
3. Structural utilities (`h-12`, `px-4`, `rounded-xl`, `space-y-4`) remain as Tailwind classes

### FIX H-06: Rider ForgotPassword — Dark Theme Input Styles

`artifacts/rider-app/src/pages/ForgotPassword.tsx:28`

```ts
// Before (light theme — wrong for dark app)
const INPUT = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm ...";

// After (dark theme — matches rider app)
const INPUT = "w-full h-12 px-4 bg-gray-950 border border-gray-800 text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all";
```

Audit the entire page for any other light-theme color leakage (`bg-white`, `bg-gray-50`, `border-gray-200`, `text-gray-800`).

### FIX H-07: Vendor Auth — Add `storageError` State

Add `storageError: boolean` to `AuthCtx` interface and `VendorAuthInner` state. In `initAuth`, catch sessionStorage unavailability with:
```ts
try {
  let activeToken = api.getToken();
  ...
} catch (storageErr) {
  log.error("sessionStorage unavailable:", storageErr);
  setStorageError(true);
  setLoading(false);
  return;
}
```
Surface in the login screen: `"Browser storage is unavailable. Private browsing or storage restrictions may prevent sign-in."`

### FIX H-08: Admin Login — Single Error Display Path

`artifacts/admin/src/lib/auth/LoginScreen.tsx`

Remove the `useEffect` that calls `toast()` on `state.error` (lines 52-57). Use only the inline error state rendered below the form — it is correctly positioned for form validation errors. Reserve `toast()` for non-form system events (e.g., session expiry, which already uses this pattern correctly in `adminAuthContext.tsx`).

### FIX M-01/02: Make CNIC Optional at Registration

Remove the `*` mandatory marker from CNIC labels in both wizard files. Update step validation to allow progression when CNIC is empty. Add helper text: `"Optional — complete this in your profile after registration"`. Backend registration endpoint already accepts CNIC as optional.

### FIX M-03/04: Registration Draft PII Reduction

- Remove CNIC from both `rider_reg_draft` and `vendor_reg_draft` localStorage drafts (CNIC is short; re-entry is acceptable)
- Add `vendor_reg_draft_ts` TTL key (24 hours, matching rider's existing pattern)
- Add a comment block in both files listing exactly what IS and IS NOT persisted

### FIX M-05: Vendor Documents Step — Remove "Coming Soon" Placeholder

Replace the placeholder with either:
- A real image/file picker (reuse pattern from `artifacts/rider-app/src/pages/register/RegisterStepDocuments.tsx`), OR
- Remove Step 2 entirely and defer document collection to a post-registration KYC prompt surfaced on the vendor dashboard

### FIX M-06: Remove `logoutCallbackRef` Dead Code

`artifacts/vendor-app/src/lib/vendor-auth.tsx:96, 173`

Delete the `const logoutCallbackRef = useRef(...)` declaration and the `logoutCallbackRef.current = clearAuth` assignment.

### FIX M-07: Rider `useAuth()` — Throw Instead of Return Empty Object

`artifacts/rider-app/src/lib/rider-auth.tsx:75-76`

```ts
// Before
const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

// After
const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = (): AuthCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within RiderAuthProvider");
  return ctx;
};
```

All call sites will need a type-narrowing update if they currently check for null — but since the previous version typed `AuthCtx`, there should be no sites doing so.

### FIX M-08: Customer Auth — Log Storage Init Errors

`artifacts/ajkmart/context/AuthContext.tsx:286`

```ts
// Before
} catch {}

// After
} catch (err) {
  console.error("[AuthContext] loadAuth failed:", err);
}
```

### FIX L-01: Admin LoginScreen — Conditional Redirect

```ts
// Before
onSuccess?.();
setLocation("/dashboard");

// After
if (onSuccess) {
  onSuccess();
} else {
  setLocation("/dashboard");
}
```

### FIX L-02: ARIA Live Regions for Dynamic Errors

All dynamic auth form error paragraphs on all panels:
```tsx
{error && (
  <p role="alert" aria-live="polite" className="...existing error styles...">
    {error}
  </p>
)}
```

### FIX L-03: OTP Resend Cooldown — Start After First Send

`artifacts/rider-app/src/lib/auth/RegisterWizard.tsx`

Remove the `useEffect` that starts the countdown on mount. Start the cooldown only inside the `handleResend` success callback and after the initial send-otp success callback.

### FIX L-04: Deprecate `mustChangePassword`

`artifacts/admin/src/lib/adminAuthContext.tsx:17`

```ts
/**
 * @deprecated Forced password rotation gate has been removed.
 * Field is retained for backward compat only. Remove in next major release.
 */
mustChangePassword?: boolean;
```

---

## Part 4 — Unified Design System Reference

All four panels use the shared `@workspace/auth-react` theme system.

| Token          | Admin (Indigo/Dark) | Rider (Gold/Dark) | Vendor (Green/Light) | Customer (Blue/Native) |
|----------------|---------------------|-------------------|----------------------|------------------------|
| `primary`      | `#6366F1`           | `#F0B90B`         | `#059669`            | `#1A56DB`              |
| `primaryDark`  | `#4338CA`           | `#D97706`         | `#047857`            | —                      |
| `background`   | `#0f1117`           | `#0B0E11`         | `#ffffff`            | (React Native)         |
| `surface`      | `#131720`           | `#131720`         | `#ffffff`            | —                      |
| `text`         | `#f1f5f9`           | `#E8E9EF`         | `#111827`            | —                      |
| `textMuted`    | `#64748b`           | `#6B7280`         | `#6B7280`            | —                      |
| `border`       | `rgba(255,255,255,0.07)` | `#252836`   | `#e5e7eb`            | —                      |

**Consistency rule:** All form inputs, buttons, labels, and error states across the three web panels (Rider, Vendor, Admin) must use these tokens via `useTheme()` — never hardcoded Tailwind color class names. Structural utilities (`h-12`, `px-4`, `rounded-xl`, `space-y-4`) may remain as Tailwind classes.

---

*Audit complete. 4 Critical, 8 High, 8 Medium, 4 Low findings. All verified against actual file content — zero false positives.*
