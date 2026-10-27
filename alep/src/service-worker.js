import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precache, addRoute } from 'workbox-precaching'

// Activate each deployment immediately and take over existing PWA windows.
self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()

// Always fetch the current app shell while online so HTML cannot point to
// hashed CSS/JS assets from a different Vercel deployment. Keep the precached
// shell as the offline fallback for installed clients.
precache(self.__WB_MANIFEST)
const offlineAppShell = createHandlerBoundToURL('index.html')
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
