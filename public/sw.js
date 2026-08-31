const CACHE_NAME = "neuburg-explorer-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Network-first, cache fallback — läuft dadurch auch offline weiter,
   holt sich aber bei jedem Deploy sofort die neueste Version.
   WICHTIG: fetch() respektiert sonst den normalen HTTP-Cache des
   Browsers und "network-first" liefert dann trotzdem eine alte,
   nur HTTP-gecachte Antwort aus, ohne wirklich ins Netz zu gehen.
   {cache:"no-store"} erzwingt einen echten Netzwerk-Request. */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
