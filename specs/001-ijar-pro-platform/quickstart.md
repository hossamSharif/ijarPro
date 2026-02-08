# Quickstart: Ijar Pro Platform

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08

## Prerequisites

- **Node.js**: 18.17+ (LTS recommended)
- **npm**: 9+ (or pnpm 8+)
- **Firebase CLI**: `npm install -g firebase-tools` then `firebase login`
- **Git**: configured on the branch `001-ijar-pro-platform`

## Project Initialization

### 1. Create Next.js Project

```bash
npx create-next-app@latest ijar-pro --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd ijar-pro
```

### 2. TypeScript Strict Mode

Verify `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 3. Install Core Dependencies

```bash
# Firebase
npm install firebase firebase-admin

# UI
npx shadcn@latest init --rtl
npm install sonner recharts

# Internationalization
npm install next-intl

# Forms & Validation
npm install zod react-hook-form @hookform/resolvers

# ZATCA & QR
npm install qrcode qrcode.react
npm install -D @types/qrcode

# Dates
npm install dayjs dayjs-hijri

# PDF Generation
npm install jspdf jspdf-autotable
npm install -D @types/jspdf

# PWA
npm install @serwist/next
npm install -D @serwist/precaching @serwist/sw

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### 4. Firebase Project Setup

```bash
# Initialize Firebase in project root
firebase init

# Select: Firestore, Hosting (with web framework), Storage, Emulators
# Firestore Rules file: firebase/firestore.rules
# Firestore Indexes file: firebase/firestore.indexes.json
# Storage Rules file: firebase/storage.rules
# Hosting: use web framework auto-detection (Next.js)
# Emulators: Auth, Firestore, Storage
```

Create `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 5. shadcn/ui Configuration

After `npx shadcn@latest init --rtl`, install commonly needed components:

```bash
npx shadcn@latest add button input label card dialog table form select textarea toast tabs badge separator dropdown-menu sheet sidebar
```

Verify `components.json` has `"rtl": true`.

### 6. Font Setup

In `app/[locale]/layout.tsx`, configure Cairo (Arabic) + Geist (Latin):

```typescript
import { Cairo } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';

const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' });
```

### 7. Tailwind Configuration

Ensure `tailwind.config.ts` uses CSS logical properties and the Cairo font:

```typescript
// Extend theme with font family
fontFamily: {
  sans: ['var(--font-cairo)', 'var(--font-geist-sans)', 'sans-serif'],
}
```

Use `ms-*`, `me-*`, `ps-*`, `pe-*` everywhere instead of `ml-*`, `mr-*`, `pl-*`, `pr-*`.

## Development Workflow

### Start Development Server + Firebase Emulators

Terminal 1 — Firebase Emulators:
```bash
firebase emulators:start
```

Terminal 2 — Next.js Dev Server:
```bash
npm run dev
```

Emulator UI: `http://localhost:4000`
App: `http://localhost:3000`

### Seed Admin Account

```bash
npx ts-node scripts/seed-admin.ts
```

This creates the initial admin user in Firebase Auth Emulator with `{ role: "admin" }` custom claim and corresponding Firestore user document.

### Run Tests

```bash
# Unit tests
npx vitest

# Watch mode
npx vitest --watch

# With Firebase Emulators (integration tests)
firebase emulators:exec "npx vitest run"
```

### Deploy

```bash
# Deploy everything
firebase deploy

# Deploy only rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes

# Deploy only hosting (app)
firebase deploy --only hosting
```

## Directory Structure

```
ijar-pro/
├── app/
│   ├── [locale]/              # Locale-based routing (ar/en)
│   │   ├── (auth)/            # Auth group (login page)
│   │   │   └── login/
│   │   ├── (dashboard)/       # Protected app group
│   │   │   ├── layout.tsx     # Sidebar + topbar layout
│   │   │   ├── page.tsx       # Dashboard home
│   │   │   ├── buildings/
│   │   │   ├── apartments/
│   │   │   ├── customers/
│   │   │   ├── invoices/
│   │   │   ├── expenses/
│   │   │   ├── journal/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── profile/
│   │   ├── layout.tsx         # Locale layout (dir, lang, fonts)
│   │   └── page.tsx           # Landing page (public)
│   ├── manifest.ts            # PWA manifest
│   ├── sw.ts                  # Service worker source (Serwist)
│   └── layout.tsx             # Root layout (minimal)
├── components/
│   ├── ui/                    # shadcn/ui components (RTL)
│   ├── layout/                # Sidebar, Topbar, FAB, SyncIndicator
│   ├── invoices/              # Invoice-specific components
│   ├── accounting/            # Journal, CoA components
│   └── shared/                # Bilingual inputs, date pickers
├── lib/
│   ├── firebase/              # Firebase initialization & helpers
│   ├── zatca/                 # TLV encoder, QR generator, validator
│   ├── accounting/            # Journal engine, CoA, balance validator
│   ├── i18n/                  # next-intl config, locale files
│   ├── permissions/           # Feature flags, permission guard
│   ├── sync/                  # Sync manager, conflict resolver
│   ├── hooks/                 # Custom React hooks
│   ├── utils/                 # Date, number, currency utilities
│   ├── validators/            # Zod schemas per entity
│   └── types/                 # TypeScript interfaces
├── public/
│   ├── icons/                 # PWA icons
│   └── fonts/                 # Arabic web fonts (if not using next/font)
├── firebase/
│   ├── firestore.rules        # Security Rules
│   ├── firestore.indexes.json # Composite indexes
│   └── storage.rules          # Storage Rules
├── scripts/
│   └── seed-admin.ts          # Initial admin seeding script
├── firebase.json
├── .firebaserc
├── next.config.js             # Next.js + Serwist PWA config
├── tailwind.config.ts
├── tsconfig.json              # strict: true
└── vitest.config.ts
```

## Key Configuration Files

### next.config.js
- Serwist PWA plugin integration
- Webpack configuration (required for Serwist)
- next-intl plugin

### firebase.json
- Hosting: web framework auto-detect for Next.js
- Firestore: rules and indexes paths
- Storage: rules path
- Emulators: ports for Auth (9099), Firestore (8080), Storage (9199)

### Environment Variables
- All `NEXT_PUBLIC_FIREBASE_*` variables for client-side Firebase config
- `FIREBASE_SERVICE_ACCOUNT` for admin SDK operations (scripts only)

## Convention Checklist

- [ ] All spacing uses logical properties (`ms-`, `me-`, `ps-`, `pe-`)
- [ ] All text has Arabic + English translations in locale files
- [ ] All dates display dual Hijri + Gregorian
- [ ] All numbers use locale-appropriate numerals
- [ ] All currency shows SAR/ر.س
- [ ] All Firestore operations use typed converters
- [ ] All financial writes include journal entries
- [ ] All significant actions create audit log entries
- [ ] All forms use Zod validation with react-hook-form
- [ ] All timestamps use UTC+3 (Saudi Arabia timezone)
