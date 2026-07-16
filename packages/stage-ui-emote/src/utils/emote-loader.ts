/**
 * E-mote driver loader utility.
 *
 * The FreeMoteDriver.js and emoteplayer.js are static script files
 * that define global `EmotePlayer`, `EmoteDevice`, and related
 * constructors on `window`. They are not ES modules and must be
 * injected via `<script>` tags.
 *
 * FreeMoteDriver.js is compiled asm.js that expects a global `Module`
 * object to be set BEFORE it executes, and it uses the Emscripten `GL`
 * global for WebGL context management.
 *
 * This loader ensures the scripts are injected exactly once and
 * resolves once `window.EmotePlayer` is available.
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

    // Wait for EmotePlayer global to be ready
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
