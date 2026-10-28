import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { addRoute, cleanupOutdatedCaches, createHandlerBoundToURL, matchPrecache, precache } from 'workbox-precaching'

// Activate each deployment immediately and take over existing PWA windows.
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()

// Always fetch the current app shell while online so HTML cannot point to
// hashed CSS/JS assets from a different Vercel deployment. Keep the precached
// shell as the offline fallback for installed clients.
precache(self.__WB_MANIFEST)
const offlineAppShell = createHandlerBoundToURL('index.html')

// Prefer the current deployment's hashed styles/scripts online. If the phone
// is offline, fall back to the matching version already in the precache.
registerRoute(({ request, url }) => (
  url.origin === self.location.origin && ['style', 'script'].includes(request.destination)
), async ({ request }) => {
  try {
    const response = await fetch(request)
    if (response.ok) return response
  } catch {
    // Continue with the matching precached asset when the network is unavailable.
  }
  return await matchPrecache(request.url) || Response.error()
})

registerRoute(new NavigationRoute(async ({ event, request }) => {
  try {
    const response = await fetch(request)
    if (response.ok) return response
  } catch {
    // Fall back to the versioned precache when the device is offline.
  }
  return offlineAppShell({ event, request })
}))
addRoute()

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data?.json() ?? {}
    } catch {
      return { body: event.data?.text() ?? '' }
    }
  })()

  event.waitUntil(self.registration.showNotification(payload.title || 'Alep Salon', {
    body: payload.body || 'Une nouvelle réservation vient d’arriver.',
    icon: '/pwa-icon-192.png',
    badge: '/pwa-icon-192.png',
    tag: payload.tag || 'alep-admin-booking',
    data: { url: payload.url || '/admin-portal' },
    renotify: true,
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = new URL(event.notification.data?.url || '/admin-portal', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.navigate(destination)
        return client.focus()
      }
    }
    return self.clients.openWindow(destination)
  })())
})
