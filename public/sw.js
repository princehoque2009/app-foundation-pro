/* Prangon push service worker.
   Handles Web Push delivery only — no app-shell/offline caching. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: "Prangon", body: event.data.text() };
    }
  }

  const title = payload.title || "Prangon";
  const options = {
    body: payload.body || "You have a new notification",
    icon: payload.icon || "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: payload.tag || payload.type || "prangon",
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url: payload.url || "/notifications", ...(payload.data || {}) },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          client.postMessage({ type: "PUSH_NOTIFICATION_CLICK", url: targetUrl });
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch (e) {
              /* focus + postMessage is enough */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
