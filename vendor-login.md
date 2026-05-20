# Vendor Login & Registration — Audit Report
**Date:** May 20, 2026  
**Scope:** `artifacts/vendor-app` (Login + Registration UI, state, API client) · `artifacts/api-server/src/routes/auth/` (register, helpers, auth-common) · `lib/db/src/schema/` (users, vendor_profiles)  
**Standard:** Production-ready, 0-bug

---

## 1. Executive Summary

The vendor auth system is architecturally sound — it uses a shared SDK (`@workspace/auth-react`), a layered token-storage strategy (sessionStorage + in-memory cache), and a well-structured multi-step registration wizard. The backend registration route is atomic (DB transaction), validates CNIC format, and correctly gates approval status.

However, **6 bugs reach Critical or High severity** and must be fixed before production:

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 4 |
| Medium | 6 |
| Low | 5 |

The two Critical issues are: (1) `clearTokens()` leaves legacy access tokens in `localStorage`, creating a token-leak vector; and (2) `sameSite: "strict"` on the vendor refresh cookie silently breaks login flows triggered from external links (email magic-links, admin approval notification emails). The High issues cover a double `api.getMe()` call creating a race in the biometric flow, missing `role="alert"` on the login error banner (accessibility/UX regression), an aggressive network-error logout during background hydration, and a missing submission guard on the registration wizard that allows duplicate `vendorRegister` calls.

---

## 2. Complete Bug Inventory

### CRITICAL

#### C-01 — Incomplete `clearTokens()` leaves legacy access token in localStorage
- **File:** `artifacts/vendor-app/src/lib/api.ts`
- **Line:** 162
- **Description:** `clearTokens()` calls `_tokenStorage.clear()` (which correctly removes both keys from `sessionStorage`) and then removes `REFRESH_KEY` from `localStorage`. It does **not** remove `TOKEN_KEY` from `localStorage`. Any session that was migrated from an older bundle that wrote the access token to `localStorage` will leave a live JWT behind in persistent storage after logout. An attacker with access to `localStorage` (XSS, shared device) can read the token.
- **Code:**
  ```ts
  // api.ts:160-163 — CURRENT (BUGGY)
  function clearTokens() {
    _tokenStorage.clear();
    try { localStorage.removeItem(REFRESH_KEY); } catch ...
    // TOKEN_KEY is never removed from localStorage!
  }
  ```

#### C-02 — `sameSite: "strict"` breaks vendor refresh cookie on cross-origin navigation
- **File:** `artifacts/api-server/src/routes/auth/helpers.ts`
- **Lines:** 78, 106
- **Description:** Both `setRiderRefreshCookie` and `setVendorRefreshCookie` set `sameSite: "strict"`. With `strict`, the browser will NOT send the cookie if the user arrives at the vendor app via a cross-site link — e.g. clicking the "Your application is approved" email link, a magic link, or any external URL. The refresh call then fails with a 401, the session appears expired, and the user is forced to re-login even though their session is still valid on the server. `sameSite: "lax"` is the correct value for auth cookies on SPAs: it allows top-level navigation cookies while still blocking CSRF from embedded forms.
- **Code:**
  ```ts
  // helpers.ts:76-83 — CURRENT (BUGGY)
  res.cookie(VENDOR_REFRESH_COOKIE, refreshRaw, {
    sameSite: "strict",   // <-- breaks cross-site top-level nav
    ...
  });
  ```

---

### HIGH

#### H-01 — Double `api.getMe()` in biometric confirm creates a race
- **File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`
- **Lines:** 74, 110
- **Description:** `doLogin()` (line 74) calls `api.getMe()` to fetch the profile and perform role-guard checks. When the biometric overlay is accepted, `confirmBiometric()` (line 110) calls `api.getMe()` again. Because the biometric overlay is shown after `doLogin` already succeeded (the `capturedTokenRef` is set at line 69), the second `getMe()` is redundant. Under slow networks or a concurrent token refresh, the two calls can race and result in `setUser(staleProfile)` overwriting a fresher profile.

#### H-02 — Login error `<div>` has no `role="alert"` — screen readers miss errors
- **File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`
- **Line:** 161
- **Description:** The error banner rendered when `loginError` is set is a plain `<div>` with no ARIA role. Screen readers (NVDA, JAWS, VoiceOver) will not announce it when it dynamically appears. Vendors using assistive technology will receive no feedback on failed login attempts.
- **Code:**
  ```tsx
  // LoginScreen.tsx:161 — CURRENT (BUGGY)
  <div style={{ ... }}>
    {loginError}
  </div>
  ```

#### H-03 — `initAuth` clears tokens on ANY network error, causing unnecessary logouts
- **File:** `artifacts/vendor-app/src/lib/vendor-auth.tsx`
- **Line:** 158
- **Description:** In the initial auth bootstrap `useEffect`, the `catch` block at line 158 calls `api.clearTokens()` and `sharedAuth.logout()` for any error that is not an `AbortError`. This means a temporary 502/503, a DNS timeout, or a network blip during the background profile fetch will silently log the vendor out even though their JWT/refresh token are still valid. The correct behaviour is to set an error state and let the user retry, not destroy their session.
- **Code:**
  ```ts
  // vendor-auth.tsx:156-159 — CURRENT (BUGGY)
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    api.clearTokens(); setToken(null); setUser(null); sharedAuth.logout(); // too aggressive
  }
  ```

#### H-04 — No submission guard on `handleSubmit` — duplicate `vendorRegister` calls possible
- **File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`
- **Line:** 355
- **Description:** `handleSubmit` is an `async` function passed to `RegisterScreen`'s `onSubmit` prop. While `RegisterScreen` presumably disables its submit button once loading, `RegisterWizard` has no local `isSubmitting` ref guard. If the parent renders again (e.g. StrictMode double-invoke, back-button tap before the promise resolves), multiple concurrent `api.vendorRegister` calls can be dispatched, creating duplicate vendor profile upserts and duplicate notification records.

---

### MEDIUM

#### M-01 — `hashOtp` reuses `JWT_SECRET` for OTP HMAC (key reuse)
- **File:** `artifacts/api-server/src/routes/auth/helpers.ts`
- **Line:** 36
- **Description:** `hashOtp` falls back to `process.env["JWT_SECRET"]` as the HMAC key when no dedicated key is provided. Using the same secret for both JWT signing and OTP hashing is cryptographic key reuse. If `JWT_SECRET` is rotated (forced by a breach), all OTPs currently in-flight are invalidated even if they haven't been used. A dedicated `OTP_HMAC_SECRET` env var should be used.

#### M-02 — `storeName` has no uniqueness check — two vendors can register the same store name
- **File:** `artifacts/api-server/src/routes/auth/register.ts`
- **Line:** 152-159
- **Description:** The `vendor_profiles` upsert uses `onConflictDoUpdate` on `userId` (correct for idempotency) but never checks whether `storeName` is already used by a different vendor. Two vendors can register with identical store names, creating confusion in the customer-facing catalog.

#### M-03 — `isActive: false` set on pending vendors breaks profile completion
- **File:** `artifacts/api-server/src/routes/auth/register.ts`
- **Line:** 147
- **Description:** When `vendor_auto_approve` is off, `isActive` is set to `false` alongside `approvalStatus: "pending"`. The `complete-profile` route (line 251) has the guard `if (!user.isActive && user.approvalStatus !== "pending")` — this correctly allows pending users through, but any other route or middleware that only checks `isActive` (not `approvalStatus`) will block a pending vendor from accessing their profile or notifications.

#### M-04 — Phone `maxLength={13}` in Documents step truncates `+92XXXXXXXXXX` (14 chars)
- **File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`
- **Line:** 109
- **Description:** The phone input has `maxLength={13}` but the placeholder shows `03XXXXXXXXX or +92XXXXXXXXXX`. A `+92` prefix number is 13 characters (`+` + 12 digits), which just fits, but if the user types a space after `+92` (a common habit) the `3` at the end gets truncated silently. `maxLength` should be `15` to accommodate spaces, or the `+92` prefix should be normalised client-side before submission.

#### M-05 — CNIC hint text is wrong colour (`text-gray-400` on gray background = low contrast)
- **File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`
- **Line:** 101
- **Description:** The format hint `"Format: XXXXX-XXXXXXX-X"` renders as `text-gray-400` on a `bg-gray-50` background. WCAG AA requires a 4.5:1 contrast ratio for small text; `gray-400` on `gray-50` is approximately 2.8:1. This is an accessibility violation.

#### M-06 — `confirmPassword` exclusion from draft is brittle — not enforced in type
- **File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`
- **Line:** 344
- **Description:** The draft-save logic destructures `password`, `confirmPassword`, and `otp` from `next` to exclude them from `localStorage`. This works correctly today, but there is no TypeScript type enforcement. If a new sensitive field (e.g. `pin`, `secretAnswer`) is added to the wizard without updating the destructure, it will silently be persisted to `localStorage`.

---

### LOW

#### L-01 — Overlay components (`PendingOverlay`, `RejectedOverlay`) don't trap focus
- **File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`
- **Lines:** 217-251
- **Description:** When `PendingOverlay` or `RejectedOverlay` are displayed, background elements remain in the DOM and accessible via Tab. Focus is not trapped inside the overlay. Users navigating by keyboard can accidentally interact with the hidden login form behind the overlay.

#### L-02 — `BiometricPromptOverlay` accepts a `loading` prop that is never passed
- **File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`
- **Line:** 155, 253
- **Description:** `BiometricPromptOverlay` declares a `loading?: boolean` prop and uses it to disable/style the buttons. However, the single render site at line 155 never passes `loading`, so the buttons are never shown as loading during `confirmBiometric()`. Vendors can double-tap "Yes" during the async biometric setup.

#### L-03 — OTP resend in `RegisterWizard` swallows the server error message
- **File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`
- **Lines:** 350-353
- **Description:** `handleOtpRequest` calls `sendOtp` and returns only `result.success` (a boolean). If the OTP send fails (e.g. rate-limited, invalid phone), the specific error string from `result.error` is discarded and replaced with a generic error in the parent `RegisterScreen`. Vendors see "Something went wrong" instead of "Too many OTP requests. Try again in 5 minutes."

#### L-04 — `ip` variable shadowed inside consent log block
- **File:** `artifacts/api-server/src/routes/auth/register.ts`
- **Lines:** 61, 164
- **Description:** `const ip = getClientIp(req)` is declared at line 61 (outer scope). Inside the consent log `try` block at line 164, `const ip = getClientIp(req)` is declared again. The inner `ip` shadows the outer one — it's functionally harmless (same value) but is a code smell that will cause a TypeScript `no-shadow` lint error and confuses future readers.

#### L-05 — `isVendorSession` uses `req.body.role` which is parsed before Zod validation
- **File:** `artifacts/api-server/src/routes/auth/helpers.ts`
- **Line:** 95-96
- **Description:** `isVendorSession` reads `req.body.role` to determine if a session is vendor. This value is read before the Zod schema's `transform()` runs (since `isVendorSession` is called inside the route handler, after middleware). While currently safe, if `req.body.role` is not constrained by the schema to an enum, a client could send `role: "vendor"` on any auth request to force a vendor cookie to be set.

---

## 3. Code Issues

### Dead/Redundant Code

| File | Lines | Issue |
|---|---|---|
| `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx` | 121-123 | `getSocialAuthConfig` is a `useCallback` that just calls `getVendorAuthConfig(config)` — it exists solely to "deduplicate" but is called only twice and adds unnecessary indirection. Inline `getVendorAuthConfig(config)` directly. |
| `artifacts/vendor-app/src/lib/vendor-auth.tsx` | 244-249 | `decodeJwtExpSafe` is exported but not imported anywhere in `vendor-app`. It delegates to `decodeJwt` from `@workspace/auth-utils`. Dead export — remove it or move to the shared utility if needed. |
| `artifacts/api-server/src/routes/auth/register.ts` | 164 | Duplicate `const ip = getClientIp(req)` shadows the outer `ip` at line 61. Remove the inner declaration and reuse the outer one. |
| `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx` | 32-34 | `isValidPakistaniPhone` wrapper function just calls `isValidPhone`. This thin wrapper is unnecessary — replace all usages with `isValidPhone` directly. |

### Unused/Redundant Imports

| File | Symbol | Issue |
|---|---|---|
| `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx` | `useRef` (line 21) | `capturedTokenRef` uses `useRef` — this is used. Not a bug. |
| `artifacts/vendor-app/src/lib/vendor-auth.tsx` | `getTokenExpiryRemaining` (line 33) | Imported from `@workspace/auth-react` but never called in this file. Dead import. |

---

## 4. Step-by-Step Fix Guide

### Fix C-01 — Add `TOKEN_KEY` removal to `clearTokens()`
**File:** `artifacts/vendor-app/src/lib/api.ts`  
**Line:** 160-163

Replace:
```ts
function clearTokens() {
  _tokenStorage.clear();
  try { localStorage.removeItem(REFRESH_KEY); } catch (err) { console.warn(..., err); }
}
```
With:
```ts
function clearTokens() {
  _tokenStorage.clear();
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch (err) { console.warn('[artifacts/vendor-app/src/lib/api.ts]', err); } // eslint-disable-line no-console
}
```

---

### Fix C-02 — Change `sameSite` from `"strict"` to `"lax"` on vendor refresh cookie
**File:** `artifacts/api-server/src/routes/auth/helpers.ts`  
**Lines:** 78, 106

In both `setRiderRefreshCookie` and `setVendorRefreshCookie`, change:
```ts
sameSite: "strict",
```
To:
```ts
sameSite: "lax",
```
Also update the matching `clearRiderRefreshCookie` and `clearVendorRefreshCookie` functions (lines 88, 116) to use `sameSite: "lax"` so the clear cookie attributes match the set attributes (required for the browser to clear it correctly).

---

### Fix H-01 — Eliminate double `api.getMe()` in biometric confirm
**File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`  
**Lines:** 99-119

`confirmBiometric` should not call `api.getMe()` again. The profile was already fetched in `doLogin`. Pass the profile down via a ref or state instead:

1. Add a `capturedProfileRef = useRef<SDKAuthUser | null>(null)` alongside `capturedTokenRef`.
2. In `doLogin`, after the role-guard passes (line 87), set `capturedProfileRef.current = profile` before calling `login(...)`.
3. In `confirmBiometric`, replace the `api.getMe()` call with:
   ```ts
   const profile = capturedProfileRef.current;
   if (!profile) { setOverlay(null); navigate("/"); return; }
   login(capturedTokenRef.current, profile, api.getRefreshToken() || undefined);
   setOverlay(null);
   navigate("/");
   ```
4. Remove the `try/catch` around `api.getMe()` in `confirmBiometric` and replace with a null-check on `capturedProfileRef.current`.

---

### Fix H-02 — Add `role="alert"` and `aria-live="assertive"` to login error banner
**File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`  
**Line:** 161

Replace:
```tsx
<div style={{ ... }}>
  {loginError}
</div>
```
With:
```tsx
<div role="alert" aria-live="assertive" style={{ ... }}>
  {loginError}
</div>
```

---

### Fix H-03 — Don't clear tokens on transient network errors in `initAuth`
**File:** `artifacts/vendor-app/src/lib/vendor-auth.tsx`  
**Lines:** 156-159

Replace:
```ts
} catch (err: unknown) {
  if (err instanceof Error && err.name === "AbortError") return;
  api.clearTokens(); setToken(null); setUser(null); sharedAuth.logout();
}
```
With:
```ts
} catch (err: unknown) {
  if (err instanceof Error && err.name === "AbortError") return;
  // Only destroy the session for auth failures (401/403), not transient errors.
  const status = (err as Record<string, unknown>)?.status as number | undefined;
  if (status === 401 || status === 403) {
    api.clearTokens(); setToken(null); setUser(null); sharedAuth.logout();
  } else {
    // Transient error (network, 5xx) — leave tokens intact, let useTokenRefresh retry.
    setToken(null); setUser(null);
  }
}
```

---

### Fix H-04 — Add submission guard to `RegisterWizard.handleSubmit`
**File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`  
**Lines:** 328, 355

1. Add a ref at the top of `RegisterWizard`:
   ```ts
   const isSubmittingRef = useRef(false);
   ```
2. Guard the `handleSubmit` function:
   ```ts
   const handleSubmit = async (data: Record<string, unknown>) => {
     if (isSubmittingRef.current) return { success: false, error: "Submission already in progress" };
     isSubmittingRef.current = true;
     try {
       const res = await api.vendorRegister({ ... });
       localStorage.removeItem(DRAFT_KEY);
       return { success: true, data: res };
     } catch (err: unknown) {
       return { success: false, error: err instanceof Error ? err.message : T("registrationFailed") };
     } finally {
       isSubmittingRef.current = false;
     }
   };
   ```

---

### Fix M-01 — Use dedicated `OTP_HMAC_SECRET` env var for OTP hashing
**File:** `artifacts/api-server/src/routes/auth/helpers.ts`  
**Line:** 36

Replace:
```ts
const secret = key ?? process.env["JWT_SECRET"];
```
With:
```ts
const secret = key ?? process.env["OTP_HMAC_SECRET"] ?? process.env["JWT_SECRET"];
if (!secret) throw new Error("[FATAL] OTP_HMAC_SECRET (or JWT_SECRET) is not set — cannot hash OTP");
```
Add `OTP_HMAC_SECRET` to the environment secrets documentation. Set it to a different value than `JWT_SECRET` in production. The fallback to `JWT_SECRET` ensures zero breaking change for existing deployments.

---

### Fix M-02 — Add `storeName` uniqueness check before upsert
**File:** `artifacts/api-server/src/routes/auth/register.ts`  
**After line:** 91 (after the username check), before the transaction at line 135

Add:
```ts
if (storeName) {
  const [existingStore] = await db
    .select({ userId: vendorProfilesTable.userId })
    .from(vendorProfilesTable)
    .where(sql`lower(${vendorProfilesTable.storeName}) = lower(${String(storeName).trim()})`)
    .limit(1);
  if (existingStore && existingStore.userId !== auth.userId) {
    sendError(res, "A store with this name already exists. Please choose a different store name.", 409);
    return;
  }
}
```

---

### Fix M-03 — Do not set `isActive: false` for pending vendors; use `approvalStatus` only
**File:** `artifacts/api-server/src/routes/auth/register.ts`  
**Line:** 147

Replace:
```ts
approvalStatus: autoApprove ? "approved" : "pending",
isActive: autoApprove ? true : false,
```
With:
```ts
approvalStatus: autoApprove ? "approved" : "pending",
isActive: true,
```
Pending vendors should remain `isActive: true` so they can log in and view their pending status. The `approvalStatus` field is the correct gate. Admin approval (which sets `approvalStatus: "approved"`) should be the action that enables full store functionality, not `isActive`. If the admin wants to disable a vendor, they should explicitly ban/deactivate them through the admin panel.

---

### Fix M-04 — Increase phone `maxLength` to 15 in Documents step
**File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`  
**Line:** 109

Change `maxLength={13}` to `maxLength={15}`.

---

### Fix M-05 — Improve CNIC hint text contrast
**File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`  
**Line:** 101

Change `className="text-gray-400 text-xs mt-1"` to `className="text-gray-500 text-xs mt-1"`. `gray-500` on `gray-50` meets WCAG AA at approximately 4.6:1.

---

### Fix M-06 — Enforce draft exclusions with an explicit allowlist
**File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`  
**Lines:** 341-348

Replace the destructure-based exclusion with an explicit allowlist:
```ts
const handleDataChange = useCallback((key: string, value: unknown) => {
  setDraft(prev => {
    const next = { ...prev, [key]: value };
    // Allowlist approach: only persist fields that are safe for localStorage.
    // Never add password, confirmPassword, otp, pin, or any credentials here.
    const SAFE_FIELDS = new Set(["storeName", "storeCategory", "ownerName", "city", "cnic", "phone", "bankName", "bankAccount", "bankAccountTitle"]);
    const safe = Object.fromEntries(Object.entries(next).filter(([k]) => SAFE_FIELDS.has(k)));
    localStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
    return next;
  });
}, []);
```

---

### Fix L-01 — Trap focus inside overlay components
**File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`  
**Lines:** 217-251

Add a `useEffect` to each overlay that traps focus. The simplest safe approach is to add `tabIndex={-1}` to all overlay container divs and set `ref` on the container with `autoFocus`. For full trap behaviour, install or reuse the existing `@radix-ui/react-focus-trap` (already in admin panel) or a lightweight `focus-trap-react`. Alternatively, add `onKeyDown` to intercept Tab and Shift+Tab:
```tsx
// Add to PendingOverlay and RejectedOverlay container div:
onKeyDown={(e) => { if (e.key === "Tab") e.preventDefault(); }}
```

---

### Fix L-02 — Pass `loading` state to `BiometricPromptOverlay`
**File:** `artifacts/vendor-app/src/lib/auth/LoginScreen.tsx`  
**Line:** 155

1. Add a `[isBiometricLoading, setIsBiometricLoading] = useState(false)` state.
2. In `confirmBiometric`, set `setIsBiometricLoading(true)` at the start and `setIsBiometricLoading(false)` in the finally block.
3. Pass it to the overlay:
   ```tsx
   if (overlay === "biometric") return (
     <BiometricPromptOverlay
       onAccept={() => void confirmBiometric(true)}
       onDecline={() => void confirmBiometric(false)}
       loading={isBiometricLoading}
     />
   );
   ```

---

### Fix L-03 — Surface OTP error message from `handleOtpRequest`
**File:** `artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx`  
**Lines:** 350-353

Replace:
```ts
const handleOtpRequest = async (phone: string) => {
  const result = await sendOtp(phone);
  return result.success;
};
```
With:
```ts
const handleOtpRequest = async (phone: string): Promise<{ success: boolean; error?: string }> => {
  const result = await sendOtp(phone);
  return { success: result.success, error: result.error };
};
```
Update the `RegisterScreen` `onOtpRequest` prop type in `@workspace/auth-react` to accept the richer return type if it doesn't already.

---

### Fix L-04 — Remove shadowed `ip` variable
**File:** `artifacts/api-server/src/routes/auth/register.ts`  
**Line:** 164

Remove the inner `const ip = getClientIp(req);` and use the outer `ip` (declared at line 61).

---

### Fix L-05 — Constrain `role` field via Zod before `isVendorSession` reads it
**File:** `artifacts/api-server/src/lib/validation/auth-schemas.ts`  
Ensure `VendorRegisterSchema` and `UserLoginSchema` define `role` as a `z.enum(["customer", "rider", "vendor", "admin"])` (or equivalent). This prevents arbitrary `role` values from reaching `isVendorSession`.

---

### Dead Code Removals

1. **`artifacts/vendor-app/src/lib/auth/RegisterWizard.tsx` lines 32-34** — Remove `isValidPakistaniPhone` wrapper function. Replace its two usages (lines 33, 303) with direct calls to `isValidPhone`.

2. **`artifacts/vendor-app/src/lib/vendor-auth.tsx` lines 244-249** — Remove exported `decodeJwtExpSafe`. If needed elsewhere, use `decodeJwt` from `@workspace/auth-utils` directly.

3. **`artifacts/vendor-app/src/lib/vendor-auth.tsx` line 33** — Remove unused `getTokenExpiryRemaining` import.

4. **`artifacts/api-server/src/routes/auth/register.ts` line 164** — Remove duplicate `const ip` (addressed in Fix L-04).

5. **`artifacts/vendor-app/src/lib/auth/LoginScreen.tsx` lines 121-123** — Inline `getSocialAuthConfig` calls: replace `const cfg = getSocialAuthConfig()` with `const cfg = getVendorAuthConfig(config)` in `handleGoogle` and `handleFacebook`. Remove the `getSocialAuthConfig` callback.
