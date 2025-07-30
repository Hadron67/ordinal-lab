const cachedResources = [
    "index.html",
    "style.css",
    "dist/main.js",
    "dist/service.js",
    "dist/main.js.map",
    "dist/service.js.map",

    "manifest.webmanifest",
    "icons/favicon.ico",
    "icons/android-chrome-192x192.png",
    "icons/android-chrome-512x512.png",
];

async function precache(name: string, resources: RequestInfo[]) {
    const cache = await self.caches.open(name);
    return cache.addAll(resources);
}

async function handleFetch(cacheName: string, params: RequestInfo) {
    try {
        const res = await fetch(params);
        if (res.ok) {
            const cache = await self.caches.open(cacheName);
            cache.put(params, res.clone());
            return res;
        }
    } catch (e) {}
    const res = self.caches.match(params);
    return res || Response.error();
}

self.addEventListener('install', ev => {
    // @ts-ignore
    ev.waitUntil(precache('precache', cachedResources));
});

self.addEventListener('fetch', ev => {
    // @ts-ignore
    ev.respondWith(handleFetch('precache', ev.request));
});
