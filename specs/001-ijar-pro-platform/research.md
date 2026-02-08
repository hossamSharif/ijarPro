# Research: Ijar Pro Platform

**Branch**: `001-ijar-pro-platform` | **Date**: 2026-02-08

## R-01: ZATCA Phase 1 TLV QR Code Encoding

### Decision
Implement custom TLV encoder using `TextEncoder` API (UTF-8) with `qrcode` npm package for QR generation. No third-party ZATCA SDK needed — the encoding is straightforward.

### Rationale
- ZATCA Phase 1 requires exactly 5 TLV tags encoded as `[Tag:1byte][Length:1byte][Value:UTF-8 bytes]`
- Tag 1: Seller Name, Tag 2: VAT Number, Tag 3: Timestamp (ISO 8601), Tag 4: Total with VAT, Tag 5: VAT Amount
- Concatenate all TLV byte arrays → Base64-encode → generate QR code from Base64 string
- `TextEncoder` is available in all modern browsers and works offline
- Length field must be **byte count** (not character count) — critical for Arabic seller names (multi-byte UTF-8)
- Amounts must use 2 decimal places with period separator (e.g., `"115.00"`)
- Numerals in TLV must be Western Arabic (0-9), not Arabic-Indic
- Base64 output must not exceed 500 characters

### Alternatives Considered
- **@axenda/zatca or @zatca/qr**: Pre-built ZATCA TLV packages. Rejected because the encoding is simple enough to implement in ~30 lines, avoiding a dependency for trivial logic.
- **Server-side QR generation**: Rejected because it violates the offline-first requirement (Constitution Article VII).

### Test Reference Data
```
Seller: "Salla" | VAT: "1234567891" | Timestamp: "2021-07-12T14:25:09Z" | Total: "100.00" | VAT: "15.00"
Expected Base64: AQVTYWxsYQIKMTIzNDU2Nzg5MQMUMjAyMS0wNy0xMlQxNDoyNTowOVoEBjEwMC4wMAUFMTUuMDA=
```

### QR Code Library
- **Decision**: Use `qrcode` (node-qrcode) — 3M+ weekly downloads, Canvas/DataURL/SVG output, fully offline
- **Alternative**: `qrcode.react` for inline React rendering — can be used alongside `qrcode` for PDF embedding (canvas → toDataURL)

### Arabic Seller Name Gotchas
- Always use UTF-8 via `TextEncoder`
- Test with both Arabic and English names
- Monitor Base64 length to stay under 500 chars
- Some ZATCA scanning apps have reported issues with Arabic-only names — include both Arabic and English in company profile

---

## R-02: Firestore Offline Persistence in Next.js App Router

### Decision
Use `initializeFirestore()` with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` in a client-only singleton module.

### Rationale
- `enableIndexedDbPersistence()` is deprecated in Firebase JS SDK v10+
- `persistentMultipleTabManager` enables multi-tab offline support (required for PWA)
- Must initialize Firestore **before** any other Firestore calls — use singleton pattern with `getApps()` check
- Module must be imported only in `'use client'` components — Firestore offline persistence requires browser IndexedDB

### Key Constraints
- **500 pending writes limit**: Designed for temporary disconnection, not long-term offline
- **Cache size**: Default 40MB, configurable with `CACHE_SIZE_UNLIMITED`
- **Transactions fail offline**: Cannot use client-side transactions when offline
- **Known performance issue**: `persistentLocalCache` reported 20x slower queries than deprecated API (Firebase issue #7347) — monitor and test

### Sync Status Tracking
- Use `snapshot.metadata.hasPendingWrites` and `snapshot.metadata.fromCache` with `includeMetadataChanges: true`
- States: Synced (`fromCache=false, hasPendingWrites=false`), Syncing (`hasPendingWrites=true`), Offline (`fromCache=true`), Error
- Supplement with `navigator.onLine` for network status layer

### Conflict Resolution
- Firestore uses **Last Write Wins** (LWW) by default — last write to reach server wins
- No client-side conflict callbacks available
- For invoice counters: client-side transactions won't work offline → use temporary OFFLINE prefix IDs, resolve server-side via Cloud Function or client transaction on reconnect

### Sequential Invoice Numbering Pattern
- **Decision**: Hybrid approach — generate temporary `OFFLINE-{deviceId}-{localSeq}` IDs when offline, resolve to final sequential number via Firestore transaction when online
- Cannot use transactions offline → must defer final numbering
- Cloud Function on invoice write can assign final number via transaction on `counters/invoices` document
- Display temporary ID to user while pending, final number once assigned

---

## R-03: next-intl with Arabic RTL in Next.js App Router

### Decision
Use `next-intl` with routing-based setup, `localePrefix: 'as-needed'`, Arabic default locale, and Tailwind logical properties.

### Rationale
- **Routing**: Define in `src/i18n/routing.ts` using `defineRouting({ locales: ['ar', 'en'], defaultLocale: 'ar', localePrefix: 'as-needed' })`
- **`as-needed` prefix**: Arabic routes have no prefix (`/about`), English routes have `/en/about`
- **RTL switching**: Set `dir` and `lang` on `<html>` in `app/[locale]/layout.tsx` based on locale param
- **Static rendering**: Use `setRequestLocale(locale)` in every page and layout (stabilized API in next-intl 3.22+)

### Tailwind CSS Logical Properties
- **Decision**: Use Tailwind v3.3+ native logical properties — no plugins needed
- `ms-*` (margin-inline-start), `me-*` (margin-inline-end), `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`
- Automatically adapt when `dir="rtl"` is set on HTML element
- **Never use** `ml-*`, `mr-*`, `pl-*`, `pr-*` for directional spacing

### Arabic Font
- **Decision**: **Cairo** as primary Arabic font — modern geometric sans-serif, excellent screen readability, optimized for digital financial applications
- **Latin companion**: Use Next.js `next/font` with a clean Latin font (e.g., Inter or Geist) for English mode
- **Alternative considered**: IBM Plex Arabic (good but reported kerning issues), Noto Kufi Arabic (official UAE design system, more government/enterprise)

### Hijri Calendar
- **Decision**: Use native `Intl.DateTimeFormat` with `islamic-umalqura` calendar for display formatting (zero dependencies)
- Supplement with `dayjs` + `dayjs-hijri` plugin for date manipulation and calendar operations
- Format: `new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { year: 'numeric', month: 'long', day: 'numeric' }).format(date)`

### Arabic-Indic Numerals
- **Decision**: Use `Intl.NumberFormat` with locale extension `-u-nu-arab` for Arabic mode, `-u-nu-latn` for English mode
- Financial data: Arabic-Indic numerals in Arabic UI, Western in English UI
- TLV/QR data: Always Western Arabic numerals (0-9)

### shadcn/ui RTL
- **Decision**: Use shadcn/ui with `--rtl` flag (January 2026 release) — automatic logical property conversion
- Setup: `npx shadcn@latest init --rtl` or `npx shadcn@latest migrate rtl`
- Config: `"rtl": true` in `components.json`
- Handles positioning, spacing, text alignment, icon flipping, and animations automatically

---

## R-04: PDF Generation with Arabic RTL

### Decision
Use **jsPDF + jspdf-autotable** as primary, with **pdfmake + @digicole/pdfmake-rtl** as fallback if Arabic RTL handling becomes too complex.

### Rationale
- jsPDF: ~200-300KB bundle, fully client-side/offline, 3M+ downloads, good table support
- Arabic support: Embed Amiri TTF font via jsPDF font converter, set font before rendering Arabic text
- RTL: Works for pure Arabic text; mixed Arabic-English requires manual positioning
- QR embedding: Render QR to canvas → `toDataURL('image/png')` → `doc.addImage()`
- Company logo: Cache from Firebase Storage as base64, embed via `doc.addImage()`

### Alternatives Considered
- **@react-pdf/renderer**: Rejected — poor Arabic RTL support (multiple open issues since 2021), 450-1200KB bundle, BiDi support broke Arabic characters
- **pdfmake + @digicole/pdfmake-rtl**: Best automatic RTL support, considered as fallback — automatic RTL detection, built-in tables, ~300-400KB
- **Puppeteer/Playwright**: Rejected — server-side only, violates offline requirement
- **html2pdf.js**: Considered — simpler but less control over invoice structure

### Implementation Strategy
1. Start with jsPDF + jspdf-autotable + Amiri font
2. Use `next/dynamic` with `ssr: false` for lazy loading
3. If Arabic RTL handling proves too complex, migrate to pdfmake + @digicole/pdfmake-rtl
4. All assets embedded as base64 for offline support

---

## R-05: Firebase Auth Custom Claims & RBAC

### Decision
Hybrid approach: core role in custom claims (`{ role: "admin" | "user" }`), granular feature permissions in Firestore `users/{uid}` document.

### Rationale
- **Custom claims**: Max 1000 bytes, zero-cost evaluation in Security Rules via `request.auth.token.role`, works offline (cached in ID token)
- **Firestore permissions**: No size limit, dynamic updates, admin can toggle features instantly
- **Security Rules**: Check role from claims (free, fast), check feature flags via `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions`)
- **`get()` limits**: 10 calls per single-doc request, 20 per multi-doc — optimize with helper functions and short-circuit evaluation

### Admin Seeding
- Node.js script (`scripts/seed-admin.ts`) using Firebase Admin SDK
- Creates user → sets `{ role: "admin" }` custom claim → creates Firestore user document
- Run once during initial deployment, never exposed as API

### Token Refresh
- ID tokens expire after 1 hour, auto-refresh when online
- On permission change: listen to Firestore user doc → call `getIdToken(true)` to force refresh
- Offline: user operates with last-synced permissions (cached in token)

### User Deactivation
- **Decision**: Hybrid — disable Firebase Auth account + set `disabled: true` in Firestore + optionally revoke refresh tokens
- Disabling Auth prevents new sign-ins immediately
- Existing sessions: token valid up to 1 hour unless revoked
- Firestore flag allows client to detect and show "account disabled" message

### Security Rules Pattern
```
function isAdmin() { return request.auth.token.role == "admin"; }
function userPermissions() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.permissions; }
function hasPermission(perm) { return isAdmin() || userPermissions()[perm] == true; }
```

---

## R-06: PWA Configuration

### Decision
Use **@serwist/next** for service worker generation, **native `app/manifest.ts`** for manifest, and **Firebase Cloud Messaging** for push notifications.

### Rationale
- **@serwist/next**: Actively maintained successor to `@ducanh2912/next-pwa` (same author), fork of Google Workbox
- `next-pwa` (shadowwalker) is unmaintained; `@ducanh2912/next-pwa` has no releases in over a year
- Serwist requires Webpack (Next.js 14 default), compatible with App Router
- Native `app/manifest.ts` is built into Next.js 14+ — no library needed

### Service Worker Strategy
- **Precache**: App shell, critical route chunks, PWA icons, default locale file
- **Runtime cache by route type**:
  - Auth routes: `NetworkOnly` (never cache)
  - API routes: `NetworkFirst` (prefer fresh, fallback to cache)
  - Static assets (images, fonts, CSS/JS): `CacheFirst`
  - Default: `StaleWhileRevalidate`
- **Offline fallback**: Create `/~offline` route for offline navigation fallback

### Manifest Configuration
```typescript
// app/manifest.ts
{ name: "إيجار برو", short_name: "إيجار برو", dir: "rtl", lang: "ar",
  display: "standalone", start_url: "/", theme_color: "#...", background_color: "#...",
  icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }, { src: "/icons/icon-512x512.png", sizes: "512x512" }] }
```

### Lighthouse PWA 100% Score
- PWA scoring is pass/fail (not 0-100): pass all criteria = 100%
- Required: valid manifest, 192+512 icons, HTTPS, service worker, offline fallback, viewport meta
- Service workers no longer mandatory for install prompt in Chrome/Edge (2025+) but still needed for offline

### Firestore + Service Worker Coexistence
- **Separation of concerns**: Service worker handles static assets, Firestore handles data persistence
- Both use IndexedDB but different database names — no direct conflicts
- Use `persistentMultipleTabManager()` for multi-tab support
- Do NOT cache Firestore-backed API responses in service worker — let Firestore SDK handle data offline
- Monitor combined IndexedDB usage for storage quota

### Push Notifications
- Firebase Cloud Messaging with VAPID keys
- Separate `firebase-messaging-sw.js` in `/public` for background notifications
- Request permission after user interaction (never auto-prompt on load)
- Store FCM tokens per user/device in Firestore
