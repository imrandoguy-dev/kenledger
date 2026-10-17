import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/* ------------------------------------------------------------------ */
/* Updates: when a new version is deployed to Netlify, the service      */
/* worker downloads it in the background and we offer an Update button. */
/* ------------------------------------------------------------------ */

export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = __BUILD_TIME__
export const COMMIT = __COMMIT__

const CHECK_EVERY = 10 * 60 * 1000 // also checks whenever the app comes back to the foreground

let updateReady = false
let registration: ServiceWorkerRegistration | undefined
const updateListeners = new Set<() => void>()
const emit = () => updateListeners.forEach((l) => l())

const markReady = () => { if (!updateReady) { updateReady = true; emit() } }

/** A new version is "ready" once its service worker has installed and is waiting to take over. */
function watch(r: ServiceWorkerRegistration) {
  if (r.waiting && navigator.serviceWorker.controller) markReady()
  r.addEventListener('updatefound', () => {
    const w = r.installing
    w?.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) markReady()
    })
  })
}

async function poll() {
  if (!registration) return
  try { await registration.update() } catch { /* offline */ }
}

const applyUpdate = registerSW({
  onNeedRefresh: markReady,
  onRegisteredSW(_url: string, r: ServiceWorkerRegistration | undefined) {
    registration = r
    if (!r) return
    watch(r)
    void poll() // check for a new deploy as soon as the app opens
    setInterval(() => { void poll() }, CHECK_EVERY)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void poll() })
    window.addEventListener('online', () => { void poll() })
  },
})

/** Ask the server whether a newer version exists. Resolves true if one is ready to install. */
export async function checkForUpdate(): Promise<boolean> {
  if (!registration) return updateReady
  await poll()
  // Give a freshly found version a few seconds to finish downloading.
  for (let i = 0; i < 40 && !updateReady && registration.installing; i++) await new Promise((r) => setTimeout(r, 250))
  if (registration.waiting && navigator.serviceWorker.controller) markReady()
  return updateReady
}

export function useAppUpdate() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    updateListeners.add(l)
    return () => { updateListeners.delete(l) }
  }, [])
  return {
    ready: updateReady,
    /** Switches to the new version and reloads the page. */
    apply: () => applyUpdate(true),
    dismiss: () => { updateReady = false; emit() },
  }
}

/* ------------------------------------------------------------------ */
/* Install to home screen                                              */
/* ------------------------------------------------------------------ */

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let deferred: BIPEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BIPEvent
    listeners.forEach((l) => l())
  })
}

export function useInstallPrompt() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return {
    canInstall: !!deferred,
    prompt: async () => {
      if (!deferred) return
      await deferred.prompt()
      deferred = null
      listeners.forEach((l) => l())
    },
  }
}
