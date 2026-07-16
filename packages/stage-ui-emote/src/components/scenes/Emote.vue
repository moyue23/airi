<script setup lang="ts">
import type { Emotion } from '../../constants/emotions'

import { onMounted, onUnmounted, ref, watch } from 'vue'

import { loadEmoteDriver, type EmotePlayerInstance } from '../../utils/emote-loader'
import { EMOTION_EmoteTimelineName_value } from '../../constants/emotions'

const props = withDefaults(defineProps<{
  modelSrc?: string
  modelId?: string
  paused?: boolean
  mouthOpenSize?: number
  cursorPosition?: { x: number, y: number }
  maxFps?: number
  renderScale?: number
}>(), {
  paused: false,
  maxFps: 0,
  renderScale: 1,
})

const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })

const canvasRef = ref<HTMLCanvasElement>()
let player: EmotePlayerInstance | null = null
let playerCreated = false

const RENDER_WIDTH = 1024
const RENDER_HEIGHT = 1024

// --- Gaze variable discovery ---
// E-mote models expose named variables via `player.variableList`.
// Variable names differ per model, so we discover them by keyword matching,
// mirroring the semantic_rules from the original Emote_Widget config.
interface GazeVariable {
  name: string
  min: number
  max: number
}

const SEMANTIC_RULES = [
  { tag: 'HEAD_LR', keywords: ['head_lr', 'angle_x', 'head_x'] },
  { tag: 'HEAD_UD', keywords: ['head_ud', 'angle_y', 'head_y'] },
  { tag: 'EYE_LR', keywords: ['eye_lr', 'eyeball_x'] },
  { tag: 'EYE_UD', keywords: ['eye_ud', 'eyeball_y'] },
  { tag: 'MOUTH_OPEN', keywords: ['mouth_talk', 'face_talk', 'mouth_open'] },
] as const

let gazeVars: Record<string, GazeVariable> = {}

function discoverGazeVariables() {
  gazeVars = {}
  if (!player?.initialized)
    return

  const anyPlayer = player as any
  const vars: Array<{ label: string, minValue: number, maxValue: number }> = anyPlayer.variableList || []

  for (const v of vars) {
    const labelLower = v.label.toLowerCase()
    for (const rule of SEMANTIC_RULES) {
      if (rule.keywords.some(kw => labelLower.includes(kw))) {
        gazeVars[rule.tag] = { name: v.label, min: v.minValue, max: v.maxValue }
        console.info(`[Emote] Mapped ${rule.tag} -> "${v.label}" [${v.minValue}, ${v.maxValue}]`)
        break
      }
    }
  }
}

function mapToRange(normalized: number, v: GazeVariable): number {
  const center = (v.max + v.min) / 2
  const amplitude = (v.max - v.min) / 2
  return center + normalized * amplitude
}

async function ensurePlayer() {
  if (playerCreated && player)
    return player

  const canvas = canvasRef.value
  if (!canvas) {
    console.warn('[Emote] canvasRef not available yet')
    return null
  }

  console.info('[Emote] Loading driver scripts...')
  await loadEmoteDriver()
  console.info('[Emote] Driver scripts loaded')

  const EP = (window as any).EmotePlayer
  if (!EP) {
    console.error('[Emote] EmotePlayer global not found after driver load')
    return null
  }

  // Set visible canvas dimensions
  canvas.width = RENDER_WIDTH
  canvas.height = RENDER_HEIGHT

  // Create the hidden WebGL render canvas (only once)
  if (!EP.renderCanvas) {
    console.info('[Emote] Creating render canvas...')
    EP.createRenderCanvas(RENDER_WIDTH, RENDER_HEIGHT)
  }

  // Create player with the visible canvas
  console.info('[Emote] Creating EmotePlayer instance...')
  player = new EP(canvas) as EmotePlayerInstance
  playerCreated = true
  console.info('[Emote] EmotePlayer created, initialized:', player.initialized)
  return player
}

async function loadModel(url: string) {
  console.info('[Emote] Loading model from:', url)
  componentState.value = 'loading'

  try {
    const p = await ensurePlayer()
    if (!p) {
      console.warn('[Emote] Player not available')
      componentState.value = 'pending'
      return
    }

    // Unload previous model if any
    if (p.initialized) {
      p.unloadData()
    }

    // Load model from URL
    console.info('[Emote] Fetching PSB data...')
    await p.promiseLoadDataFromURL(url)
    console.info('[Emote] Model loaded, initialized:', p.initialized, 'charaProfile:', p.isCharaProfileAvailable)

    // Discover gaze variables from the model's variable list
    discoverGazeVariables()

    // Auto-center the model
    if (p.isCharaProfileAvailable) {
      const bounds = p.charaBounds
      if (bounds && bounds.right !== bounds.left) {
        const modelWidth = bounds.right - bounds.left
        const modelHeight = bounds.bottom - bounds.top
        if (modelWidth > 0 && modelHeight > 0) {
          const scaleX = RENDER_WIDTH / modelWidth
          const scaleY = RENDER_HEIGHT / modelHeight
          const scale = Math.min(scaleX, scaleY) * 0.95
          const centerX = (bounds.left + bounds.right) / 2
          const centerY = (bounds.top + bounds.bottom) / 2
          p.setScale(scale, 0)
          p.setCoord(-centerX * scale, -centerY * scale, 0)
        }
      }
    }

    componentState.value = 'mounted'
  }
  catch (err) {
    console.error('[Emote] Failed to load model:', err)
    componentState.value = 'pending'
  }
}

onMounted(() => {
  if (props.modelSrc)
    loadModel(props.modelSrc)
})

watch(() => props.modelSrc, (src) => {
  if (src)
    loadModel(src)
})

watch(() => props.mouthOpenSize, (v) => {
  if (!player || v === undefined)
    return
  const mouthVar = gazeVars.MOUTH_OPEN
  if (mouthVar) {
    const range = mouthVar.max - mouthVar.min
    player.setVariable(mouthVar.name, mouthVar.min + v * range, 50)
  }
  else {
    // Fallback: try common name with 0-30 range
    player.setVariable('mouth_open', v * 30, 50)
  }
})

watch(() => props.cursorPosition, (pos) => {
  if (!player || !pos)
    return

  const x = (pos.x / window.innerWidth) * 2 - 1
  const y = (pos.y / window.innerHeight) * 2 - 1

  // Head movement
  if (gazeVars.HEAD_LR)
    player.setVariable(gazeVars.HEAD_LR.name, mapToRange(x, gazeVars.HEAD_LR), 100)
  if (gazeVars.HEAD_UD)
    player.setVariable(gazeVars.HEAD_UD.name, mapToRange(y, gazeVars.HEAD_UD), 100)

  // Eye movement
  if (gazeVars.EYE_LR)
    player.setVariable(gazeVars.EYE_LR.name, mapToRange(x, gazeVars.EYE_LR), 100)
  if (gazeVars.EYE_UD)
    player.setVariable(gazeVars.EYE_UD.name, mapToRange(y, gazeVars.EYE_UD), 100)
}, { deep: true })

onUnmounted(() => {
  player?.unloadData?.()
  player = null
  playerCreated = false
})

defineExpose({
  canvasElement: () => canvasRef.value,
  captureFrame: () => {
    const canvas = canvasRef.value
    if (!canvas)
      return Promise.resolve(null)
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  },
  setEmotion: (emotion: Emotion, _intensity?: number) => {
    const timeline = EMOTION_EmoteTimelineName_value[emotion]
    player?.playTimeline(timeline)
  },
  playTimeline: (label: string) => {
    player?.playTimeline(label)
  },
  setVariable: (name: string, value: number, duration?: number) => {
    player?.setVariable(name, value, duration ?? 0)
  },
  setScale: (scale: number, duration?: number) => {
    player?.setScale(scale, duration ?? 0)
  },
  setCoord: (x: number, y: number, duration?: number) => {
    player?.setCoord(x, y, duration ?? 0)
  },
  listTimelines: () => player?.mainTimelineLabels ?? [],
  listVariables: () => {
    const anyPlayer = player as any
    return anyPlayer?.variableList ?? []
  },
})
</script>

<template>
  <div h-full w-full>
    <canvas
      ref="canvasRef"
      style="width: 100%; height: 100%; display: block; object-fit: contain;"
    />
  </div>
</template>
