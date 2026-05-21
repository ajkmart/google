# AJKMart — Admin Panel Complete Guide

## Overview

AJKMart Admin Panel ek comprehensive web dashboard hai jo React + Vite + TypeScript se bana hai.
Yeh `/admin` prefix par run hota hai aur role-based access control (RBAC) implement karta hai.

**Base URL:** `http://localhost:3000/admin`
**Router:** Wouter (`base="/admin"`)
**Auth:** JWT-based admin session (separate from customer/rider/vendor auth)
**API:** All requests go through `/api/admin/*` endpoints

---

## Project Structure

```
artifacts/admin/
├── src/
│   ├── App.tsx                        # Root router — ALL routes registered here
│   ├── components/
│   │   ├── layout/
│   │   │   └── AdminLayout.tsx        # Sidebar + header shell
│   │   ├── MobileDrawer.tsx           # Mobile sidebar drawer
│   │   ├── CommandPalette.tsx         # Cmd+K search across all nav items
│   │   ├── PullToRefresh.tsx          # Pull-to-refresh wrapper (blue accent)
│   │   ├── ErrorBoundary.tsx          # React error boundary
│   │   └── ui/                        # Radix UI components (Button, Dialog, etc.)
│   ├── hooks/
│   │   ├── usePermissions.ts          # has(permission) helper from JWT claims
│   │   ├── useVersionCheck.ts         # Auto-reload on new deploy
│   │   └── useAdminFetcher.ts         # Authenticated fetch wrapper
│   ├── lib/
│   │   ├── adminAuthContext.tsx       # Admin JWT state, login/logout, token refresh
│   │   ├── adminFetcher.ts            # Fetch interceptor — attaches Bearer token
│   │   ├── navConfig.ts               # ALL nav groups, items, icons, permissions
│   │   ├── envValidation.ts           # VITE_* env var audit on startup
│   │   ├── logger.ts                  # Pino-style frontend logger
│   │   ├── sentry.ts                  # Sentry init (from platform_settings)
│   │   └── useAccessibilitySettings.ts
│   └── pages/                         # One file per page/route
```

---

## Authentication

### Admin Auth Flow
1. Admin visits `/admin` → redirected to `/admin/login`
2. Submits username + password (+ optional TOTP)
3. API: `POST /api/admin/v2/login` → returns `{ accessToken, admin }`
4. Token stored in `AdminAuthContext` (memory) + refresh via `POST /api/admin/v2/refresh-token`
5. All subsequent requests include `Authorization: Bearer <token>`

### Auth API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/v2/login` | POST | Login with username + password |
| `/api/admin/v2/logout` | POST | Invalidate session |
| `/api/admin/v2/me` | GET | Current admin profile |
| `/api/admin/v2/check-session` | GET | Validate token still active |
| `/api/admin/v2/forgot-password` | POST | Send reset link |
| `/api/admin/v2/reset-password` | POST | Set new password with token |
| `/api/admin/v2/mfa/status` | GET | Check if TOTP is enabled |
| `/api/admin/v2/mfa/setup` | POST | Initialize TOTP setup |
| `/api/admin/v2/mfa/verify` | POST | Complete TOTP setup |
| `/api/admin/v2/sessions` | GET | All active admin sessions |
| `/api/admin/v2/sessions/:id` | DELETE | Revoke specific session |

---

## Permission System (RBAC)

### How It Works
- Each admin has a `permissions` array in their JWT payload
- `usePermissions().has("permission.key")` checks if a permission exists
- `ProtectedRoute` component redirects to `/403` if permission missing
- Permissions are managed via `/admin/roles-permissions`

### Permission Keys Reference

| Permission Key | Controls Access To |
|---------------|-------------------|
| `dashboard.view` | Dashboard |
| `orders.view` | Orders, Order management |
| `fleet.rides.view` | Rides, Van, Live Map, Riders, SOS Alerts |
| `fleet.pharmacy.view` | Pharmacy orders |
| `fleet.parcel.view` | Parcel deliveries |
| `vendors.view` | Vendors, Delivery Access, Inventory Settings |
| `users.view` | Users management |
| `finance.kyc.view` | KYC verification |
| `finance.transactions.view` | Transactions, Wallet Transfers, Analytics |
| `finance.withdrawals.view` | Withdrawals page |
| `finance.deposits.review` | Deposit Requests |
| `content.products.view` | Products, Categories, Reviews, Banners, Popups, FAQs, Deep Links, QR Codes, Wishlist Insights |
| `promotions.view` | Promotions, Promo Codes, Flash Deals, Loyalty |
| `support.broadcast.send` | Communications, Broadcast, SMS Gateways |
| `support.chat.view` | Support Chat, Chat Monitor |
| `system.settings.view` | Settings, App Management, Health, Error Monitor, Business Rules, Webhooks, WhatsApp Log, Experiments, Search Analytics |
| `system.settings.edit` | Auth Methods, Auth Control, OTP Control |
| `system.audit.view` | Audit Logs, Consent Log |
| `system.roles.manage` | Roles & Permissions |
| `system.maintenance` | Launch Control |

---

## All Routes — Complete Reference

### Auth Routes (no login required)
| Route | Page File | Description |
|-------|-----------|-------------|
| `/admin/login` | `login.tsx` | Admin login form |
| `/admin/forgot-password` | `forgot-password.tsx` | Password reset request |
| `/admin/reset-password` | `reset-password.tsx` | Reset with OTP token |
| `/admin/set-new-password` | `set-new-password.tsx` | Set new password after reset |

### Dashboard
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/dashboard` | `dashboard.tsx` | `dashboard.view` | `GET /api/admin/dashboard/stats`, `GET /api/stats` |

### Operations Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/orders` | `orders/index.tsx` | `orders.view` | `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`, `GET /api/admin/orders/stats` |
| `/admin/rides` | `rides.tsx` | `fleet.rides.view` | `GET /api/admin/rides`, `PATCH /api/admin/rides/:id`, `POST /api/admin/rides/:id/cancel` |
| `/admin/van` | `van.tsx` | `fleet.rides.view` | `GET /api/admin/routes`, `GET /api/admin/vehicles`, `GET /api/admin/schedules`, `GET /api/admin/drivers`, `GET /api/admin/bookings` |
| `/admin/pharmacy` | `pharmacy.tsx` | `fleet.pharmacy.view` | `GET /api/pharmacy/orders`, `PATCH /api/admin/orders/:id` |
| `/admin/parcel` | `parcel.tsx` | `fleet.parcel.view` | `GET /api/parcel/my-bookings`, `PATCH /api/admin/orders/:id` |
| `/admin/delivery-access` | `delivery-access.tsx` | `vendors.view` | `GET /api/admin/delivery-access`, `PUT /api/admin/delivery-access/mode`, `GET /api/admin/delivery-access/requests`, `PATCH /api/admin/delivery-access/requests/:id` |

### People Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/users` | `users.tsx` | `users.view` | `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/ban` |
| `/admin/riders` | `riders.tsx` | `fleet.rides.view` | `GET /api/admin/riders`, `PATCH /api/admin/riders/:id/status`, `POST /api/admin/riders/:id/bonus` |
| `/admin/vendors` | `vendors.tsx` | `vendors.view` | `GET /api/admin/vendors`, `PATCH /api/admin/vendors/:id/status` |
| `/admin/kyc` | `kyc.tsx` | `finance.kyc.view` | `GET /api/admin/kyc`, `PATCH /api/admin/kyc/:id` |

### Catalog Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/products` | `products.tsx` | `content.products.view` | `GET /api/admin/products`, `POST /api/admin/products`, `PATCH /api/admin/products/:id`, `DELETE /api/admin/products/:id`, `PATCH /api/admin/products/:id/approve` |
| `/admin/categories` | `categories.tsx` | `content.products.view` | `GET /api/admin/categories/tree`, `POST /api/admin/categories`, `PATCH /api/admin/categories/:id`, `DELETE /api/admin/categories/:id` |
| `/admin/reviews` | `reviews.tsx` | `content.products.view` | `GET /api/reviews/vendor/:id`, `GET /api/reviews/product/:id` |
| `/admin/vendor-inventory-settings` | `vendor-inventory-settings.tsx` | `vendors.view` | `GET /api/admin/inventory-settings`, `PUT /api/admin/inventory-settings` |

### Finance Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/transactions` | `transactions.tsx` | `finance.transactions.view` | `GET /api/admin/transactions` |
| `/admin/withdrawals` | `Withdrawals.tsx` | `finance.withdrawals.view` | `GET /api/admin/withdrawal-requests` |
| `/admin/deposit-requests` | `DepositRequests.tsx` | `finance.deposits.review` | `GET /api/admin/deposit-requests` |
| `/admin/wallet-transfers` | `wallet-transfers.tsx` | `finance.transactions.view` | `GET /api/admin/wallet-transfers` |
| `/admin/loyalty` | `loyalty.tsx` | `promotions.view` | `GET /api/admin/loyalty/campaigns`, `GET /api/admin/loyalty/rewards`, `GET /api/admin/loyalty/stats` |

### Marketing Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/promotions` | `promotions-hub.tsx` | `promotions.view` | `GET /api/admin/promo-codes`, `POST /api/admin/promo-codes` |
| `/admin/promo-codes` | `promo-codes.tsx` | `promotions.view` | `GET /api/admin/promo-codes`, `POST /api/admin/promo-codes`, `PATCH /api/admin/promo-codes/:id` |
| `/admin/flash-deals` | `flash-deals.tsx` | `promotions.view` | `GET /api/admin/flash-deals`, `POST /api/admin/flash-deals`, `PATCH /api/admin/flash-deals/:id` |
| `/admin/banners` | `banners.tsx` | `content.products.view` | `GET /api/admin/banners`, `POST /api/admin/banners`, `PATCH /api/admin/banners/:id`, `PATCH /api/admin/banners/reorder` |
| `/admin/popups` | `popups.tsx` | `content.products.view` | `GET /api/admin/popups`, `POST /api/admin/popups`, `PATCH /api/admin/popups/:id` |

### Communications Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/communications` | `communication.tsx` | `support.broadcast.send` | `GET /api/admin/communication/dashboard`, `POST /api/admin/broadcast`, `GET /api/admin/broadcasts` |
| `/admin/broadcast` | `broadcast.tsx` | `support.broadcast.send` | `POST /api/admin/broadcast`, `GET /api/admin/broadcasts` |
| `/admin/support-chat` | `support-chat.tsx` | `support.chat.view` | `GET /api/admin/support-chat`, `POST /api/admin/support-chat/:id/reply` |
| `/admin/faq-management` | `faq-management.tsx` | `content.products.view` | `GET /api/admin/faq`, `POST /api/admin/faq`, `PATCH /api/admin/faq/:id`, `DELETE /api/admin/faq/:id` |
| `/admin/sms-gateways` | `sms-gateways.tsx` | `support.broadcast.send` | `GET /api/admin/sms-gateways`, `POST /api/admin/sms-gateways`, `POST /api/admin/sms-gateways/test` |

### Analytics Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/analytics` | `analytics.tsx` | `finance.transactions.view` | `GET /api/stats`, `GET /api/admin/analytics` |
| `/admin/revenue-analytics` | `revenue-analytics.tsx` | `finance.transactions.view` | `GET /api/stats/metrics` |
| `/admin/search-analytics` | `search-analytics.tsx` | `system.settings.view` | `GET /api/admin/search-analytics`, `GET /api/admin/search-analytics/trending` |
| `/admin/wishlist-insights` | `wishlist-insights.tsx` | `content.products.view` | `GET /api/admin/wishlist-analytics` |
| `/admin/qr-codes` | `qr-codes.tsx` | `content.products.view` | `GET /api/admin/qr-codes`, `POST /api/admin/qr-codes` |
| `/admin/experiments` | `experiments.tsx` | `system.settings.view` | `GET /api/admin/experiments`, `POST /api/admin/experiments` |

### Security Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/security` | `security.tsx` | `system.settings.view` | `GET /api/admin/security/audit-logs`, `GET /api/admin/security/active-sessions`, `POST /api/admin/security/block-ip` |
| `/admin/audit-logs` | `audit-logs.tsx` | `system.audit.view` | `GET /api/admin/security/audit-logs` |
| `/admin/consent-log` | `consent-log.tsx` | `system.audit.view` | `GET /api/legal/consent-log` |
| `/admin/roles-permissions` | `roles-permissions.tsx` | `system.roles.manage` | `GET /api/admin/role-presets`, `POST /api/admin/role-presets`, `PUT /api/admin/role-presets/:id` |
| `/admin/sos-alerts` | `sos-alerts.tsx` | `fleet.rides.view` | `GET /api/sos/alerts`, `PATCH /api/sos/alerts/:id/acknowledge`, `PATCH /api/sos/alerts/:id/resolve` |

### Health & Monitoring Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/health-dashboard` | `health-dashboard.tsx` | `system.settings.view` | `GET /api/health`, `GET /api/health/schema-drift` |
| `/admin/error-monitor` | `error-monitor.tsx` | `system.settings.view` | `GET /api/error-reports`, `PATCH /api/error-reports/:id`, `POST /api/error-reports/:id/resolve` |
| `/admin/live-riders-map` | `live-riders-map.tsx` | `fleet.rides.view` | `GET /api/admin/riders` + Socket.io `rider:location` events |
| `/admin/chat-monitor` | `chat-monitor.tsx` | `support.chat.view` | `GET /api/admin/chat-monitor/conversations`, `GET /api/admin/chat-monitor/reports` |

### Configuration Group
| Route | Page File | Permission | API Endpoints |
|-------|-----------|-----------|---------------|
| `/admin/settings` | `settings.tsx` | `system.settings.view` | `GET /api/settings`, `PUT /api/settings` |
| `/admin/app-management` | `app-management.tsx` | `system.settings.view` | `GET /api/admin/launch/settings`, `PATCH /api/admin/launch/feature/:id` |
| `/admin/auth-methods` | `auth-methods.tsx` | `system.settings.edit` | `GET /api/admin/auth/methods`, `PATCH /api/admin/auth/methods` |
| `/admin/auth-control` | `auth-control.tsx` | `system.settings.edit` | `GET /api/admin/auth/events`, `GET /api/admin/auth/locked-users`, `POST /api/admin/auth/broadcast-logout` |
| `/admin/launch-control` | `launch-control.tsx` | `system.maintenance` | `GET /api/admin/launch/settings`, `POST /api/admin/launch/mode` |
| `/admin/otp-control` | `otp-control.tsx` | `system.settings.edit` | `GET /api/admin/otp/status`, `POST /api/admin/otp/disable`, `GET /api/admin/whitelist` |
| `/admin/business-rules` | `business-rules.tsx` | `system.settings.view` | `GET /api/business-rules`, `POST /api/business-rules`, `PUT /api/business-rules/:id` |
| `/admin/deep-links` | `deep-links.tsx` | `content.products.view` | `GET /api/admin/deep-links`, `POST /api/admin/deep-links`, `DELETE /api/admin/deep-links/:id` |
| `/admin/webhooks` | `webhook-manager.tsx` | `system.settings.view` | `GET /api/admin/webhooks`, `POST /api/admin/webhooks`, `PATCH /api/admin/webhooks/:id` |
| `/admin/whatsapp-delivery-log` | `whatsapp-delivery-log.tsx` | `system.settings.view` | `GET /api/admin/whatsapp/delivery-log` |
| `/admin/account-conditions` | `account-conditions.tsx` | `system.settings.view` | `GET /api/admin/conditions`, `POST /api/admin/conditions` |
| `/admin/condition-rules` | `condition-rules.tsx` | `system.settings.view` | `GET /api/admin/condition-rules`, `POST /api/admin/condition-rules` |
| `/admin/accessibility` | `accessibility.tsx` | `system.settings.view` | Local settings only |

### Error Pages
| Route | Page File | Description |
|-------|-----------|-------------|
| `/admin/403` | `forbidden.tsx` | Permission denied |
| `/admin/404` | `not-found.tsx` | Page not found |
| `*` (catch-all) | `not-found.tsx` | Unknown routes |

---

## Settings Sub-Sections

The `/admin/settings` page has multiple tabs, each loading a sub-component:

| Tab Key | Sub-Component | What It Configures |
|---------|--------------|-------------------|
| `general` | `settings-general.tsx` | App name, contact info, default language, timezone |
| `payment` | `settings-payment.tsx` | Payment gateways, wallet limits, payout rules |
| `integrations` | `settings-integrations.tsx` | Maps (OSM/Mapbox/Google), SMS, WhatsApp, Sentry, Firebase |
| `security` | `settings-security.tsx` | Session TTL, JWT secret rotation, IP allowlist |
| `system` | `settings-system.tsx` | DB pool, caching, maintenance mode |
| `weather` | `settings-weather.tsx` | Weather API provider + location |
| `compliance` | `settings-compliance.tsx` | GDPR, data retention, AML thresholds |
| `branding` | `settings-branding.tsx` | Logo, colors, app store metadata |

---

## Real-Time Features

### Live Riders Map (`/admin/live-riders-map`)
- Connects to Socket.io room: `admin-fleet`
- Listens to: `rider:location`, `rider:offline`, `rider:online`
- Displays: real-time GPS markers, active trip indicators (pulsing red), vehicle type badges
- Features: username labels toggle, offline dimming, history playback slider, map provider switching

### Order Real-Time Updates
- Admin orders page listens to Socket.io `order:status` events
- No polling — push-based updates

### SOS Alerts (`/admin/sos-alerts`)
- Listens to `sos:new` Socket.io events
- Mobile notification badge on nav item when new SOS arrives

---

## How Admin Connects to Other Apps

### Customer App (artifacts/ajkmart) ↔ Admin
| Admin Feature | Customer Impact |
|--------------|----------------|
| Products → Approve/Reject | Product visible/hidden in customer app |
| Banners → Add/Edit | Banner carousel on customer home screen |
| Flash Deals → Manage | Flash deal section on customer home |
| Promo Codes → Create | Customer can apply coupon at checkout |
| Platform Config → Auth Methods | Which login methods customer sees |
| OTP Control → Disable | Customer OTP login blocked |
| Delivery Access → Whitelist | Which areas customer can order from |
| Categories → CRUD | Category sidebar in customer app |

### Vendor App (artifacts/vendor-app) ↔ Admin
| Admin Feature | Vendor Impact |
|--------------|--------------|
| Vendors → Approve | Vendor can start accepting orders |
| Vendors → Suspend | Vendor dashboard shows suspended message |
| Products → Approve | Vendor product appears in customer search |
| Finance → Rider/Vendor Status | Payout eligibility |
| Inventory Settings | Vendor sees inventory warning thresholds |

### Rider App (artifacts/rider-app) ↔ Admin
| Admin Feature | Rider Impact |
|--------------|-------------|
| Riders → Approve | Rider can go online and accept rides |
| Rides → Assign | Rider gets dispatch notification |
| Live Map → Focus | Admin sees rider real-time position |
| SOS → Acknowledge | Rider SOS marked as seen |
| Finance → Rider Bonus | Rider wallet credited |
| OTP Control | Rider trip OTP delivery method |

---

## Database Tables Used by Admin

| Admin Section | Primary Tables |
|--------------|---------------|
| Users | `users`, `rider_profiles`, `vendor_profiles`, `otp_tokens`, `sessions` |
| Orders | `orders`, `order_items`, `products`, `users` |
| Rides | `rides`, `users`, `live_locations`, `ride_bids` |
| Finance | `wallet_transactions`, `withdrawal_requests`, `deposit_requests` |
| Products | `products`, `product_variants`, `categories`, `reviews` |
| Marketing | `promo_codes`, `flash_deals`, `banners`, `popups`, `loyalty_campaigns` |
| Communication | `notifications`, `support_messages`, `otp_delivery_log`, `sms_gateways` |
| Security | `audit_logs`, `blocked_ips`, `admin_sessions`, `magic_link_tokens` |
| Settings | `platform_settings` (single-row JSON config table) |
| System | `error_reports`, `experiments`, `webhooks`, `deep_links` |

---

## Key Components

### AdminLayout (`components/layout/AdminLayout.tsx`)
- Renders full sidebar on desktop, collapsible drawer on mobile
- Sidebar links come from `navConfig.ts` NAV_GROUPS
- Active link highlighted using `isActivePath()` from navConfig
- Permission-filtered: items hidden if admin lacks required permission

### PullToRefresh (`components/PullToRefresh.tsx`)
- Blue accent color (vendor = orange, rider = green)
- Touch gesture: pull down 60px → spinner → calls `onRefresh`
- Shows "Last updated: X ago" timestamp
- Wraps all data pages

### CommandPalette (`components/CommandPalette.tsx`)
- Triggered by Cmd+K (Mac) or Ctrl+K (Windows)
- Searches across all `NAV_ITEMS` from navConfig
- Instant navigation on selection

### ErrorRetry (`components/ui/ErrorRetry.tsx`)
- Used for both inline errors and full-page timeouts
- `variant="page"` renders a centered full-page error with retry button

---

## E2E Flow Examples

### New Vendor Onboarding
1. Vendor registers in Vendor App → status: `pending`
2. Admin visits `/admin/vendors` → sees vendor in Pending tab
3. Admin clicks Approve → API: `PATCH /api/admin/vendors/:id/status { status: "approved" }`
4. Vendor app refreshes → shows full dashboard

### Customer Ride Booking Flow
1. Customer books ride in AJKMart app → `POST /api/rides`
2. Admin can monitor at `/admin/rides` (real-time updates)
3. Admin Fleet Map (`/admin/live-riders-map`) shows rider moving
4. If SOS triggered → `/admin/sos-alerts` shows alert + admin can acknowledge

### Product Approval Flow
1. Vendor creates product in Vendor App → status: `pending`
2. Admin `/admin/products` → Pending tab → reviews product
3. Admin approves → `PATCH /api/admin/products/:id/approve`
4. Product now searchable by customers in AJKMart app

---

## Environment Variables (Admin App)

| Variable | Required | Purpose |
|---------|----------|---------|
| `VITE_API_BASE_URL` | Optional | Override API server URL (defaults to same origin) |
| `VITE_SENTRY_DSN` | Optional | Frontend error tracking |
| `VITE_APP_VERSION` | Optional | Version shown in footer, used by version check hook |

---

## Running the Admin App

```bash
# Development
cd artifacts/admin && pnpm dev        # Starts on port 3000

# Or via monorepo workflow
pnpm --filter @workspace/admin run dev

# TypeScript check
cd artifacts/admin && pnpm tsc --noEmit

# Build for production
cd artifacts/admin && pnpm build
```

---

## Common Admin Tasks

### Adding a New Page
1. Create page file: `artifacts/admin/src/pages/my-page.tsx` with `export default function MyPage()`
2. Add lazy import in `App.tsx`: `const MyPage = lazy(() => import("@/pages/my-page"))`
3. Add route in `App.tsx` AppRoutes `<Switch>`: `<Route path="/my-page"><ProtectedRoute component={MyPage} requirePermission="..." /></Route>`
4. Add nav entry in `navConfig.ts` under appropriate group

### Adding a New Permission
1. Add to relevant admin's permissions array via `/admin/roles-permissions`
2. Use in page: `const { has } = usePermissions(); if (!has("new.permission")) return null;`
3. Add to `ProtectedRoute`: `requirePermission="new.permission"`

### Making an Authenticated API Call
```typescript
import { adminFetch } from "@/lib/adminFetcher";

// GET
const data = await adminFetch("/api/admin/some-endpoint");

// POST
const result = await adminFetch("/api/admin/some-endpoint", {
  method: "POST",
  body: JSON.stringify({ key: "value" }),
});
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Page shows 404 | Route not registered in App.tsx | Add `<Route>` in AppRoutes Switch |
| Page shows 403 | Admin lacks permission | Check permission key in navConfig, add to role |
| API returns 401 | Token expired | `adminAuthContext.refreshAccessToken()` handles this automatically |
| Nav item doesn't appear | Missing permission | Super admin account has all permissions by default |
| Socket not receiving events | Not in correct room | Check `socket.join("admin-fleet")` is called on server connect |
| Settings not saving | `platform_settings` row missing | Run seed or `POST /api/admin/launch/reset-defaults` |
