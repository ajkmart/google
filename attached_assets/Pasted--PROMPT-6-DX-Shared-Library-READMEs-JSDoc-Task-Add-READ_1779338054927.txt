═══ PROMPT 6 — DX: Shared Library READMEs + JSDoc ═══
Task: Add README.md and JSDoc comments to all shared libraries.
Files to create:
1. lib/db/README.md
   Content sections:
   - Overview: PostgreSQL + Drizzle ORM, 105+ tables
   - Setup: DATABASE_URL env var, drizzle-kit push
   - Schema structure: lib/db/src/schema/ (one file per table)
   - Migration workflow: pnpm db:push, pnpm db:generate, pnpm db:migrate
   - Usage example: import { db, usersTable } from "@workspace/db"
   - Table categories (auth, commerce, rides, wallet, admin, content)
   - Foreign key conventions (onDelete: cascade vs set null)
2. lib/i18n/README.md
   Content sections:
   - Supported languages: English, Urdu, Roman Urdu, Dual modes
   - Usage: t("key", lang), tDual("key", lang), isRTL(lang)
   - Adding new keys: edit lib/i18n/src/index.ts, add to all 3 sections
   - Translation key naming convention (camelCase)
3. lib/auth-utils/README.md
   Content sections:
   - Server helpers: isAuthMethodEnabled(), isAuthMethodEnabledStrict()
   - Web components: TwoFactorSetup, TwoFactorVerify, MagicLinkSender
   - Native (Expo): CaptchaModal, useGoogleLoginNative, useFacebookLoginNative
   - JWT helpers: signAccessToken, verifyUserJwt, sign2faChallengeToken
   - Required env vars: RECAPTCHA_SITE_KEY, GOOGLE_CLIENT_ID, FACEBOOK_APP_ID
4. lib/auth-react/README.md
   Content sections:
   - Components: OtpInput, PhoneInput, OtpTimer
   - Provider: SharedAuthProvider (wraps React Query + AuthContext)
   - Usage across Admin, Vendor, Rider apps
5. lib/api-client-react/README.md
   Content sections:
   - Auto-generated hooks from OpenAPI spec (Orval codegen)
   - Manual additions in discovery.ts (wishlist, reviews, categories)
   - Build step: pnpm build (generates dist/index.d.ts)
   - Usage: import { getWishlist, addToWishlist } from "@workspace/api-client-react"
JSDoc to add (key functions):
artifacts/api-server/src/lib/fireAndForget.ts:
/**
 * Executes an async operation in the background without blocking the caller.
 * Errors are caught and logged — the calling request continues regardless.
 *
 * @param promise - The async operation to execute
 * @param label   - Identifier used in error logs (e.g. "auth:webhook:registered")
 * @param logger  - Pino logger instance
 * @param meta    - Optional metadata added to error log (userId, code, etc.)
 */