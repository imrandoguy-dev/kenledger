import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/* ------------------------------------------------------------------ */
/* Updates: when a new version is deployed to Netlify, the service      */
/* worker downloads it in the background and we offer an Update button. */
/* ------------------------------------------------------------------ */

export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = __BUILD_TIME__
export const COMMIT = __COMMIT__

const CHECK_EVERY = 5 * 60 * 1000 // also checks whenever the app comes back to the foreground

let updateReady = false
/** What the newest deploy changed, shown in the update popup. */
let latestNote = ''
let latestBuild = ''
let dismissedBuild = ''
let registration: ServiceWorkerRegistration | undefined
const updateListeners = new Set<() => void>()
const emit = () => updateListeners.forEach((l) => l())

const markReady = () => { if (!updateReady && dismissedBuild !== (latestBuild || 'sw')) { updateReady = true; emit() } }

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

/**
 * Ask the server directly which build is live. This doesn't depend on the
 * service worker noticing the change, which some phones do unreliably.
 */
async function newerOnServer(): Promise<boolean> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return false
    const v = (await r.json()) as { built?: string; note?: string }
    if (!v.built || v.built === BUILD_TIME) return false
    if (v.built !== latestBuild) { latestBuild = v.built; latestNote = v.note ?? ''; emit() }
    return true
  } catch { return false } // offline, or a preview build without version.json
}

async function poll() {
  if (registration) { try { await registration.update() } catch { /* offline */ } }
  if (await newerOnServer()) markReady()
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Last resort: drop the cached app (not your data, which is in the sheet + localStorage) and reload fresh. */
async function hardReload() {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    const keys = await caches?.keys?.() ?? []
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch { /* ignore */ }
  location.replace(`${location.pathname}?v=${Date.now()}${location.hash}`)
}

const UPDATING = 'kl-updating'

/** Switch to the newest version, falling back to a clean reload if the service worker doesn't cooperate. */
async function installLatest() {
  await poll()
  // New versions take over on their own (skipWaiting); give a download in progress time to finish.
  for (let i = 0; i < 40 && registration?.installing; i++) await sleep(250)
  if (registration?.waiting) { void applyUpdate(true); await sleep(1500) } // versions from before skipWaiting
  try { sessionStorage.setItem(UPDATING, '1') } catch { /* ignore */ }
  location.reload()
}

/** Right after an update reload: if we somehow still got the old app, clear it out and load fresh. */
void (async () => {
  let pending = false
  try { pending = sessionStorage.getItem(UPDATING) === '1'; sessionStorage.removeItem(UPDATING) } catch { /* ignore */ }
  if (pending && await newerOnServer()) await hardReload()
})()

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
  dismissedBuild = '' // asking explicitly always shows what's available
  if (!registration) { if (await newerOnServer()) markReady(); return updateReady }
  await poll()
  // Give a freshly found version a few seconds to finish downloading.
  for (let i = 0; i < 40 && !updateReady && registration.installing; i++) await sleep(250)
  if (registration.waiting && navigator.serviceWorker.controller) markReady()
  if (!updateReady && await newerOnServer()) markReady()
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
    note: latestNote,
    /** Switches to the new version and reloads the page. */
    apply: installLatest,
    /** Hide until a newer deploy than this one arrives. */
    dismiss: () => { dismissedBuild = latestBuild || 'sw'; updateReady = false; emit() },
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
