// Smart GST Billing System — Service Worker
// Strategy:
//   - App shell (index.html) → Cache-first
//   - CDN assets (React, Tailwind, etc.) → Cache-first with network fallback
//   - Supabase API calls → Network-first with cache fallback
//   - Everything else → Network-first

const CACHE_NAME = 'gst-billing-v1';
const SHELL_ASSETS = [
    '/',
    '/index.html',
];
const CDN_ORIGINS = [
    'https://unpkg.com',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

// ── Activate: clean up old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and chrome-extension URLs
    if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

    // Supabase / API calls → Network-first (don't cache auth/data)
    if (url.hostname.includes('supabase') || url.hostname.includes('neon') || url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // CDN assets → Cache-first (they're versioned/static)
    if (CDN_ORIGINS.some(o => request.url.startsWith(o))) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // App shell → Cache-first
    if (url.hostname === self.location.hostname) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Everything else → Network-first
    event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}
