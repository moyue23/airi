/**
 * E-mote driver loader utility.
 *
 * The FreeMoteDriver.js and emoteplayer.js are static script files
 * that define global `EmotePlayer`, `EmoteDevice`, and related
 * constructors. They are not ES modules and must be injected via
 * `<script>` tags.
 *
 * IMPORTANT: `class EmotePlayer` in a classic script creates a global
 * LEXICAL binding — it is accessible as a bare `EmotePlayer` identifier
 * but does NOT appear as a property on `window`. We bridge this gap by
 * injecting an inline script that copies the reference to `window`.
 *
 * FreeMoteDriver.js is compiled asm.js (Emscripten) that expects a
 * global `Module` object to be set BEFORE it executes.
 */

let driverLoaded = false
let driverPromise: Promise<void> | null = null

const DRIVER_BASE_PATH = '/driver'

/** Paths to the E-mote driver scripts, served from `public/driver/`. */
const DRIVER_SCRIPTS = [
  `${DRIVER_BASE_PATH}/emoteplayer.js`,
  `${DRIVER_BASE_PATH}/FreeMoteDriver.js`,
]

/**
 * Minimal type declarations for the E-mote player instance.
 *
 * The actual API is defined by `emoteplayer.js` (FreeMote SDK);
 * these interfaces only cover the methods we call from AIRI.
 */
export interface EmotePlayerInstance {
  playerId: number | null
  initialized: boolean
  mainTimelineLabels: string[]
  scale: number
  coord: [number, number]
  isCharaProfileAvailable: boolean
  charaBounds: { left: number, top: number, right: number, bottom: number }

  promiseLoadDataFromURL(...urls: string[]): Promise<void>
  loadData(...files: Uint8Array[]): void
  unloadData(): void
  setVariable(name: string, value: number, duration?: number): void
  playTimeline(label: string, flags?: number): void
  setScale(scale: number, duration?: number): void
  setCoord(x: number, y: number, duration?: number): void
  pause?(): void
  resume?(): void
  on(event: string, callback: () => void): void
  off(event: string, callback: () => void): void
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded?
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null
    if (existing) {
      if (existing.readyState && existing.readyState !== 'complete') {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error(`Failed to load: ${src}`)))
      }
      else {
        resolve()
      }
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = false
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load E-mote driver script: ${src}`))
    document.head.appendChild(script)
  })
}

/**
 * Bridges global lexical bindings (created by `class` declarations in
 * classic scripts) to `window` properties so they can be accessed from
 * module scope.
 *
 * `class EmotePlayer` in a classic `<script>` creates a binding in the
 * global lexical environment. This is accessible as a bare identifier
 * but NOT as `window.EmotePlayer`. We use an inline script to copy it.
 */
function bridgeGlobals(): void {
  const bridge = document.createElement('script')
  bridge.textContent = `
    if (typeof EmotePlayer !== 'undefined' && !window.EmotePlayer) window.EmotePlayer = EmotePlayer;
    if (typeof EmoteDevice !== 'undefined' && !window.EmoteDevice) window.EmoteDevice = EmoteDevice;
  `
  document.head.appendChild(bridge)
}

/**
 * Loads the E-mote driver scripts (emoteplayer.js + FreeMoteDriver.js)
 * and ensures `window.EmotePlayer` is available.
 *
 * Must be called before creating any `EmotePlayer` instance.
 * Safe to call multiple times — subsequent calls return the same promise.
 */
export function loadEmoteDriver(): Promise<void> {
  if (driverLoaded)
    return Promise.resolve()

  if (driverPromise)
    return driverPromise

  driverPromise = (async () => {
    const w = window as any

    // Set up the Module config required by FreeMoteDriver.js (Emscripten asm.js)
    // This MUST be set before the script executes.
    if (!w.Module) {
      w.Module = { TOTAL_MEMORY: 256 * 1024 * 1024 }
    }

    // Inject scripts in order: emoteplayer.js first (defines EmotePlayer/EmoteDevice classes),
    // then FreeMoteDriver.js (defines the asm.js runtime + GL + exported C functions)
    for (const src of DRIVER_SCRIPTS) {
      await injectScript(src)
    }

    // Bridge global lexical bindings to window properties
    bridgeGlobals()

    // Verify EmotePlayer is now accessible on window
    if (!w.EmotePlayer) {
      throw new Error('E-mote driver loaded but EmotePlayer global is not available')
    }

    driverLoaded = true
  })()

  return driverPromise
}

/**
 * Checks whether the E-mote driver has been loaded.
 */
export function isEmoteDriverLoaded(): boolean {
  return driverLoaded
}
