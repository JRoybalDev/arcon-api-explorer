const cacheName = "arcon-vault-shell-v1";
const shellFiles = ["/", "/manifest.webmanifest", "/favicon.svg"];

function shouldCache(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/content/") || url.pathname.startsWith("/content-thumb/") || url.pathname.startsWith("/uploads/")) {
    return false;
  }

  return request.mode === "navigate" || url.pathname === "/" || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/pwa/") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.svg";
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(shellFiles)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (!shouldCache(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match("/")))
  );
});
