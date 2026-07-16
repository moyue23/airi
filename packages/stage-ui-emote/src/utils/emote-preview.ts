import type { EmotePlayerInstance } from './emote-loader'

import { loadEmoteDriver } from './emote-loader'

/**
 * Renders a preview frame of a user-imported PSB model file.
 *
 * Creates an offscreen canvas, loads the E-mote driver, initialises
 * an EmotePlayer with the file data, waits for one rendered frame,
 * and returns a data URL suitable for the model-selector thumbnail.
 *
 * Returns `undefined` if rendering fails or times out.
 */
export async function loadEmoteModelPreview(file: File): Promise<string | undefined> {
  let canvas: HTMLCanvasElement | undefined
  let player: EmotePlayerInstance | null = null

  try {
    await loadEmoteDriver()

    const EP = (window as any).EmotePlayer

    const previewWidth = 720
    const previewHeight = 960

    canvas = document.createElement('canvas')
    canvas.width = previewWidth
    canvas.height = previewHeight
    canvas.style.position = 'absolute'
    canvas.style.left = '-99999px'
    canvas.style.top = '0'
    document.body.appendChild(canvas)

    EP.createRenderCanvas(previewWidth, previewHeight)
    player = new EP(canvas) as EmotePlayerInstance

    const buffer = await file.arrayBuffer()
    const data = new Uint8Array(buffer)
    player.loadData(data)

    // Wait for a rendered frame, then capture.
    return await new Promise<string | undefined>((resolve) => {
      let resolved = false
      const finish = (value: string | undefined) => {
        if (resolved)
          return
        resolved = true
        resolve(value)
      }

      // Try capturing after a short delay to allow first frame render.
      setTimeout(() => {
        try {
          if (player?.initialized) {
            const dataUrl = canvas!.toDataURL('image/png')
            finish(dataUrl)
          }
          else {
            finish(undefined)
          }
        }
        catch (err) {
          console.error('[Emote] Failed to capture preview:', err)
          finish(undefined)
        }
      }, 500)

      // Hard timeout
      setTimeout(finish, 4000, undefined)
    })
  }
  catch (err) {
    console.error('[Emote] Preview generation failed:', err)
    return undefined
  }
  finally {
    player?.unloadData?.()
    if (canvas?.isConnected)
      canvas.remove()
  }
}
