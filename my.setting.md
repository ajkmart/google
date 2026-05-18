# AJKMart Super App — Complete Project Settings & Documentation

> Roman Urdu mein likha gaya — sabse important settings, config, aur project ka complete blueprint.

---

## 1. PROJECT KYA HAI?

**AJKMart** ek "Super App" hai Azad Jammu & Kashmir (Pakistan) ke liye. Ek hi app mein yeh sab kuch hai:

- Mart / Grocery Shopping
- Food Delivery
- Taxi / Bike Booking (Rides)
- Pharmacy Order
- Parcel Delivery
- Digital Wallet (payment system)

**4 alag apps hain:** Customer App, Vendor App, Rider App, Admin Panel — aur ek shared Backend API.

---

## 2. PROJECT STRUCTURE (Folder Layout)

```
workspace/
├── artifacts/                  ← Sare apps yahan hain
│   ├── api-server/             ← Backend (Node.js + Express)
│   ├── ajkmart/                ← Customer Mobile App (Expo/React Native)
│   ├── admin/                  ← Admin Panel (React + Vite)
│   ├── vendor-app/             ← Vendor App (React + Vite)
│   ├── rider-app/              ← Rider App (React + Vite)
│   └── mockup-sandbox/         ← UI Design Preview Server
├── lib/                        ← Shared libraries (sab apps use karti hain)
│   ├── db/                     ← Database schema + connection (Drizzle ORM)
│   ├── api-spec/               ← OpenAPI/Swagger definitions
│   ├── api-client-react/       ← Auto-generated API client (TypeScript)
│   ├── api-zod/                ← Zod validation schemas
│   ├── auth-utils/             ← Shared auth components (2FA, OAuth, Magic Links)
│   ├── i18n/                   ← Translations (English, Urdu, Hindi)
│   └── service-constants/      ← Shared business logic constants
├── package.json                ← Root workspace config
├── pnpm-workspace.yaml         ← pnpm monorepo config
└── my.setting.md               ← Yeh file (aap ki guide)
```

**Package Manager:** `pnpm` (npm ya yarn use NAHI karna)
**Language:** TypeScript (sabhi apps mein)

---

## 3. APPS AUR UNKE PORTS

> **Important:** Har app ka PORT environment variable se aata hai. Replit automatically port assign karta hai. Hard-coded port nahi hai.

| App | Type | Preview Path | Framework | Kiske liye |
|-----|------|-------------|-----------|-----------|
| AJKMart Super App | Mobile (Expo) | `/` | Expo + React Native | Customers |
| API Server | Backend | `/api` | Node.js + Express 5 | Sab apps ka backend |
| Admin Panel | Web | `/admin` | React + Vite | Admins |
| Vendor App | Web | `/vendor/` | React + Vite | Vendors/Merchants |
| Rider App | Web | `/rider/` | React + Vite | Delivery Riders |
| Mockup Sandbox | Design | `/__mockup` | Vite | UI Prototyping |

**Production mein PORT:**
- Har app `process.env.PORT` se port read karta hai
- Agar `PORT` env var nahi mili to app crash ho jaata hai (intentional — silent fail nahi hota)
- Deployment service (Replit Deploy, VPS, etc.) ye port provide karti hai

---

## 4. ENVIRONMENT VARIABLES (Secrets)

> **Yeh secrets Replit ke "Secrets" tab mein store hote hain. Kabhi bhi `.env` file mein commit mat karo.**

### Zaruri (Required) Secrets:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT Tokens (kam az kam 32 characters ka random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
ADMIN_JWT_SECRET=your-admin-jwt-secret-minimum-32-chars

# App Domain (Replit pe automatic milta hai)
PORT=3000                          # Har app ke liye alag port
BASE_PATH=/api                     # API server ka base path
EXPO_PUBLIC_DOMAIN=your-repl-dev-domain.replit.dev  # Mobile app ke liye API URL

# Admin Setup
ADMIN_SECRET=initial-admin-setup-secret
```

### Optional (but Recommended) Secrets:

```env
# Email (Magic Links, Notifications ke liye)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password

# SMS/OTP (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# AI (Review Moderation ke liye)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://...

# Bot Protection
RECAPTCHA_SECRET_KEY=your-recaptcha-key

# Push Notifications (VAPID keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@ajkmart.com

# VPN/Proxy Detection (optional pro key)
IP_API_KEY=your-ip-api-key
```

### Secrets Kaise Set Karen (Replit mein):
1. Left sidebar mein "Secrets" icon par click karen (lock icon)
2. "+ New Secret" par click karen
3. Key aur Value dalen, Save karen
4. App restart ho jaye gi automatically

---

## 5. DATABASE

**Database:** PostgreSQL
**ORM:** Drizzle ORM (SQL-like TypeScript queries)
**Connection:** `lib/db/src/index.ts`

### Connection String Format:
```
DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

### Database Tables (Main Schema):

| Table | Kya store hota hai |
|-------|-------------------|
| `users` | Sare users (customer, rider, vendor, admin) |
| `orders` | Mart/Food/Pharmacy orders |
| `rides` | Taxi/Bike bookings |
| `products` | Marketplace products |
| `categories` | Product categories (hierarchical) |
| `wallet_transactions` | Wallet top-up, transfer, withdrawal |
| `kyc_verifications` | ID verification records |
| `live_locations` | Real-time rider/driver locations |
| `location_logs` | Historical location data |
| `pending_otps` | OTP verification codes |
| `reviews` | Product & service reviews |
| `wishlist` | User wishlist items |
| `banners` | Homepage banners |

### Database Migrations:
- Migrations Drizzle ORM ke through handle hote hain
- Kuch migrations server start par automatically run hote hain (like `ensureAuthMethodColumn`)
- Production DB update karne ke liye:
  ```bash
  pnpm --filter @workspace/db run push
  ```

### Replit Built-in Database:
- Replit ka free PostgreSQL automatically `DATABASE_URL` set karta hai
- Admin user: Replit ke Database tab mein credentials milenge

---

## 6. LOGIN / AUTHENTICATION

### Kaise Kaam Karta Hai:

**Step 1: Check Identifier**
```
POST /api/auth/check-identifier
Body: { "identifier": "phone_number_or_email" }
Response: { isNewUser: true/false, availableMethods: ["otp", "password", "google"] }
```

**Step 2: Login ya Register**
- Naya user → Registration flow
- Existing user → Available methods mein se choose

### Login Methods:

| Method | Kaise | Kab Use Karen |
|--------|-------|---------------|
| Phone OTP | SMS ya WhatsApp par code | Primary method |
| Password | Email/phone + password | Optional security |
| Google OAuth | Google account | Social login |
| Facebook OAuth | Facebook account | Social login |
| Magic Link | Email par clickable link | Passwordless |
| 2FA (TOTP) | Authenticator app code | Extra security |
| Biometric | Fingerprint/Face ID | Mobile only |

### JWT Token System:
- Login ke baad **JWT token** milta hai
- Token `Authorization: Bearer TOKEN` header mein bheja jata hai
- Admin ke liye **alag JWT secret** (`ADMIN_JWT_SECRET`) hai
- Token mein `tokenVersion` hota hai — agar sab sessions logout karni hon to version increment hoti hai
- Token expiry: Standard users ke liye configurable

### User Roles:

| Role | Kya kar sakta hai |
|------|------------------|
| `customer` | Order karna, wallet, rides |
| `vendor` | Products manage, orders accept |
| `rider` | Deliveries, rides accept |
| `admin` | Sab kuch manage karna |

### Admin Default Login:
- Pehli baar `ADMIN_SECRET` environment variable se admin account create hota hai
- Admin panel URL: `your-domain/admin`
- Admin login: `/admin/login`

---

## 7. FRONTEND (Har App Ka UI)

### A. AJKMart Customer App (Mobile)
- **Framework:** Expo (React Native) v54
- **Routing:** Expo Router (file-based, jaise Next.js)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State:** React Query (server state), React Context (local state)
- **Key Screens:**
  - `app/(tabs)/index.tsx` — Home
  - `app/(tabs)/cart.tsx` — Cart
  - `app/(tabs)/orders.tsx` — Orders
  - `app/(tabs)/profile.tsx` — Profile
  - `app/mart/` — Mart/Grocery
  - `app/rides/` — Taxi/Bike
  - `app/wallet/` — Digital Wallet
  - `app/auth/` — Login/Register screens

### B. Admin Panel
- **Framework:** React 19 + Vite
- **Routing:** Wouter
- **UI:** Shadcn UI + Tailwind CSS
- **Key Pages:**
  - `/admin/dashboard` — Overview
  - `/admin/users` — User management
  - `/admin/orders` — Order management
  - `/admin/rides` — Ride management
  - `/admin/products` — Product management
  - `/admin/categories` — Category management
  - `/admin/finance` — Financial reports
  - `/admin/settings` — System settings

### C. Vendor App
- **Framework:** React 19 + Vite
- **Routing:** Wouter
- **UI:** Shadcn UI + Tailwind CSS
- **Key Features:** Product listing, order management, earnings

### D. Rider App
- **Framework:** React 19 + Vite
- **Routing:** Wouter
- **UI:** Shadcn UI + Tailwind CSS
- **Key Features:** Order pickup, delivery tracking, earnings

---

## 8. BACKEND API ROUTES

**Base URL:** `/api`
**Framework:** Express 5 (Node.js)

### Main Route Groups:

```
/api/auth          → Login, Register, OTP, 2FA, Magic Links, OAuth
/api/users         → Profile, sessions, login history
/api/products      → Product listings, search, variants
/api/categories    → Category tree, CRUD
/api/orders        → Place order, track, status updates
/api/rides         → Ride booking, driver dispatch, bidding
/api/wallet        → Top-up, P2P transfer, withdrawal
/api/payments      → JazzCash, EasyPaisa, Bank Transfer
/api/vendor        → Vendor dashboard, product management
/api/rider         → Rider profile, location updates
/api/admin         → Admin management routes
/api/maps          → Geocoding, autocomplete, static maps
/api/reviews       → Product & service reviews
/api/wishlist      → User wishlist
/api/notifications → Push notifications
/api/kyc           → Identity verification
/api/pharmacy      → Prescription orders
/api/parcel        → Parcel delivery
/api/banners       → Homepage banners
/api/health        → Server health check
```

### Real-time (Socket.io):
- Live rider location tracking
- Order status updates
- Ride dispatch notifications
- Driver bidding system

### Payment Gateways:
- **JazzCash** — Pakistan mobile payment
- **EasyPaisa** — Pakistan mobile payment
- **Manual Bank Transfer** — Verification se

---

## 9. PRODUCTION KE LIYE KYA CHAHIYE

### Minimum Requirements:

1. **PostgreSQL Database** — Cloud provider (Railway, Supabase, Neon, ya Replit DB)
2. **Node.js Server** — v20+ recommended
3. **Sare Environment Variables** set hon (section 4 dekho)
4. **Domain name** (optional but recommended)
5. **SSL/TLS certificate** (HTTPS — production mein zaruri)

### Build Commands:

```bash
# Puri project build karna
pnpm run build

# Sirf API server build karna
pnpm --filter @workspace/api-server run build

# Sirf Admin panel build karna
pnpm --filter @workspace/admin run build

# Sirf Vendor App build karna
pnpm --filter @workspace/vendor-app run build

# Sirf Rider App build karna
pnpm --filter @workspace/rider-app run build
```

### Replit Deployment (Sabse Aasan):
1. Replit mein "Deploy" button click karo
2. Sab secrets Secrets tab mein set karo
3. "Publish" karo — ek `.replit.app` domain milega
4. Production automatically sab workflows start karta hai

### VPS Deployment (Ubuntu/Debian):

```bash
# 1. System packages
sudo apt update && sudo apt install nodejs npm postgresql -y
npm install -g pnpm

# 2. Code clone karo
git clone https://github.com/your-username/ajkmart.git
cd ajkmart

# 3. Dependencies install
pnpm install

# 4. Environment variables set karo
cp .env.example .env
nano .env   # Apni values daalo

# 5. Database setup
psql -U postgres -c "CREATE DATABASE ajkmart;"
pnpm --filter @workspace/db run push

# 6. Build karo
pnpm run build

# 7. PM2 se run karo (background service)
npm install -g pm2
pm2 start artifacts/api-server/dist/index.mjs --name "ajkmart-api"
pm2 serve artifacts/admin/dist/public 3001 --name "ajkmart-admin" --spa
pm2 serve artifacts/vendor-app/dist/public 3002 --name "ajkmart-vendor" --spa
pm2 serve artifacts/rider-app/dist/public 3003 --name "ajkmart-rider" --spa
pm2 startup && pm2 save
```

### GitHub Codespaces:

```bash
# Codespace open karo, phir:
pnpm install

# Secrets set karo (Codespace Secrets ya .env file)
# GitHub Settings → Codespaces → Secrets mein add karo

# Development mode
pnpm run dev   # Ya har app ko alag start karo

# Ports automatically forward ho jate hain Codespaces mein
```

---

## 10. GITHUB PUSH KARNA

### Pehli Baar Setup:

```bash
# Git initialize (agar nahi hai)
git init

# GitHub repo link karo
git remote add origin https://github.com/your-username/ajkmart.git

# .gitignore check karo (node_modules, .env, etc.)
cat .gitignore
```

### .gitignore Mein Ye Zarur Hona Chahiye:

```gitignore
node_modules/
.env
.env.local
dist/
*.log
.DS_Store
```

### Code Push Karna:

```bash
git add .
git commit -m "feat: apni changes ka description"
git push origin main
```

### GitHub se Features Add Karna (Copy-Paste Workflow):

```
Step 1: GitHub par file/folder dhundo jo add karna hai
Step 2: Raw content copy karo (Raw button click karo GitHub par)
Step 3: Apne project mein same path par file create karo
Step 4: Content paste karo
Step 5: Dependencies check karo — koi naya package use ho raha hai to:
         pnpm --filter @workspace/TARGET_APP add package-name
Step 6: Import paths fix karo (GitHub ka project alag structure ho sakta hai)
Step 7: Test karo: pnpm run dev
Step 8: Kaam kare to commit karo
```

**Important:** Kisi bhi external GitHub repo se code copy karte waqt:
- License check karo (MIT, Apache — OK; GPL — careful)
- Import paths apne project structure ke mutabiq adjust karo
- `@workspace/` prefix apne shared packages ke liye use karo

---

## 11. ONE-CLICK CLONE AUR CHALAANA

### Replit par Clone (Sabse Aasan):

1. GitHub repo public hona chahiye
2. `https://replit.com/github/your-username/ajkmart` URL visit karo
3. Replit automatically import karega
4. Secrets tab mein environment variables add karo
5. "Run" button dabao — sab workflows start ho jayenge

### Local Machine par Clone:

```bash
# Clone
git clone https://github.com/your-username/ajkmart.git
cd ajkmart

# pnpm install karo (npm nahi!)
npm install -g pnpm
pnpm install

# .env file banao
cp .env.example .env
# .env mein apni DATABASE_URL aur doosre secrets daalo

# Database setup
pnpm --filter @workspace/db run push

# Sab apps ek saath chalaao
pnpm run dev

# Ya alag alag:
pnpm --filter @workspace/api-server run dev     # API: localhost:PORT
pnpm --filter @workspace/admin run dev          # Admin: localhost:PORT
pnpm --filter @workspace/vendor-app run dev     # Vendor: localhost:PORT
pnpm --filter @workspace/rider-app run dev      # Rider: localhost:PORT
pnpm --filter @workspace/ajkmart run dev        # Mobile: Expo DevTools
```

### Docker se Chalaana (Advanced):

```dockerfile
# Dockerfile example (api-server ke liye)
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install && pnpm run build
ENV PORT=3000
CMD ["node", "artifacts/api-server/dist/index.mjs"]
```

---

## 12. KNOWN BUGS / ISSUES

### Current Known Issues:

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | VPN Detection API (ip-api.com) free tier rate limit ho sakta hai high traffic mein | Medium | `api-server/src/routes/auth.ts` |
| 2 | Auth method column migration server start par run hoti hai — multi-instance deploy mein race condition possible | Medium | `api-server/src/routes/admin.ts` |
| 3 | `EXPO_PUBLIC_DOMAIN` galat set ho to mobile app API se connect nahi hoti | High | `artifacts/ajkmart` |
| 4 | PORT env var na hone par app crash hoti hai (intentional hard fail — silent fallback nahi) | Info | All apps |
| 5 | Drizzle dynamic queries mein kuch `as any` casts abhi bhi hain | Low | Various route files |

### Debugging Karna:

```bash
# API server logs dekhna
pnpm --filter @workspace/api-server run dev
# Pino logger structured JSON logs deta hai

# Database connection test
pnpm --filter @workspace/db run studio   # Drizzle Studio browser mein khulta hai

# Type errors check karna
pnpm run typecheck

# Specific app ke logs Replit mein
# Workflow tab → App name → Console
```

---

## 13. SECURITY FEATURES

- **TOR Exit Node Detection** — TOR se login block
- **VPN/Proxy Detection** — Suspicious logins detect karna
- **IP-based Rate Limiting** — Brute force se bachao
- **Account-based Rate Limiting** — Ek account par attempts limit
- **JWT Token Versioning** — Global logout/revocation support
- **reCAPTCHA** — Bot protection on auth routes
- **KYC Verification** — ID verification for vendors/riders
- **2FA Support** — TOTP authenticator app
- **Bcrypt Password Hashing** — Plain passwords kabhi store nahi hote

---

## 14. SHARED LIBRARIES (lib/ folder)

Ye libraries sab apps share karti hain:

| Library | Kya karta hai |
|---------|--------------|
| `@workspace/db` | Database connection + schema — `import { db } from '@workspace/db'` |
| `@workspace/api-client-react` | API calls karne ke liye React hooks |
| `@workspace/api-zod` | Request/Response validation schemas |
| `@workspace/auth-utils` | Login components (2FA, Magic Link, OAuth) |
| `@workspace/i18n` | English/Urdu/Hindi translations |
| `@workspace/service-constants` | Business logic constants (fees, limits, etc.) |

---

## 15. DEVELOPMENT WORKFLOW (Recommended)

```
1. Feature banana ho to:
   → Pehle API route banao (api-server/src/routes/)
   → Phir lib/api-client-react mein function add karo
   → Phir Frontend component banao

2. Database change ho to:
   → lib/db/src/schema/ mein schema update karo
   → pnpm --filter @workspace/db run push (dev DB update)
   → Production DB ke liye same command production DATABASE_URL ke saath

3. Har app independently develop ho sakti hai
   → Sirf PORT aur DATABASE_URL chahiye

4. Testing:
   → Manually app use karke test karo
   → API test karne ke liye: curl ya Postman use karo
   → http://localhost:PORT/api/health → { status: "ok" }
```

---

## 16. QUICK REFERENCE COMMANDS

```bash
# Install dependencies
pnpm install

# Sab apps dev mode mein chalaao
pnpm run dev

# Build karo production ke liye
pnpm run build

# Type check karo
pnpm run typecheck

# Database schema push karo
pnpm --filter @workspace/db run push

# Database GUI (browser mein)
pnpm --filter @workspace/db run studio

# Ek specific app install karo
pnpm --filter @workspace/api-server add package-name

# Sab apps mein dependency add karo
pnpm add -w package-name
```

---

## 17. CONTACT / SUPPORT

- Replit community: replit.com/community
- Drizzle ORM docs: orm.drizzle.team
- Expo docs: docs.expo.dev
- Express 5 docs: expressjs.com

---

*Last Updated: May 18, 2026*
*Version: 1.0*
