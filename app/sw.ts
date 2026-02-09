/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry, type RuntimeCaching } from 'serwist';
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

const runtimeCaching: RuntimeCaching[] = [
  // Auth routes — never cache
  {
    matcher: /\/api\/auth\//,
    handler: new NetworkOnly(),
  },
  // Firebase Auth endpoints — never cache
  {
    matcher: /\/(identitytoolkit|securetoken)\.googleapis\.com/,
    handler: new NetworkOnly(),
  },
  // Next.js API routes — prefer fresh, fallback to cache
  {
    matcher: /\/api\//,
    handler: new NetworkFirst({
      cacheName: 'api-cache',
      networkTimeoutSeconds: 10,
    }),
  },
  // Static assets (fonts, CSS, JS) — cache first
  {
    matcher: /\.(?:js|css|woff2?|ttf|otf|eot)$/,
    handler: new CacheFirst({
      cacheName: 'static-assets',
      matchOptions: {
        ignoreVary: true,
      },
    }),
  },
  // Images — cache first
  {
    matcher: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
    handler: new CacheFirst({
      cacheName: 'image-assets',
      matchOptions: {
        ignoreVary: true,
      },
    }),
  },
  // Google Fonts stylesheets — stale while revalidate
  {
    matcher: /^https:\/\/fonts\.googleapis\.com/,
    handler: new StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
    }),
  },
  // Google Fonts webfonts — cache first (font files rarely change)
  {
    matcher: /^https:\/\/fonts\.gstatic\.com/,
    handler: new CacheFirst({
      cacheName: 'google-fonts-webfonts',
    }),
  },
  // Navigation requests — network first with fallback
  {
    matcher: ({ request }) => request.mode === 'navigate',
    handler: new NetworkFirst({
      cacheName: 'pages-cache',
      networkTimeoutSeconds: 5,
    }),
  },
  // All other requests — stale while revalidate
  {
    matcher: /.*/,
    handler: new StaleWhileRevalidate({
      cacheName: 'default-cache',
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
