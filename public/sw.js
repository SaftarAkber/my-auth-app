/* Tworing service worker — yalnız telefon bildirişləri üçün (səhifələri keşləmir) */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Tworing", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Tworing";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || "/" },
      lang: "az",
    }),
  );
});

// Bildirişə toxunanda: sayt açıqdırsa həmin pəncərədə keçid, yoxdursa yeni pəncərə
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          return c.focus().then(() => ("navigate" in c ? c.navigate(url) : null));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
