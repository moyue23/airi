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

async function ensurePlayer() {
  if (playerCreated && player)
    return player

  const canvas = canvasRef.value
  if (!canvas)
    return null

  await loadEmoteDriver()

  const EP = (window as any).EmotePlayer

  // Set visible canvas dimensions
  canvas.width = RENDER_WIDTH
  canvas.height = RENDER_HEIGHT

  // Create the hidden WebGL render canvas (only once)
  if (!EP.renderCanvas) {
    EP.createRenderCanvas(RENDER_WIDTH, RENDER_HEIGHT)
  }

  // Create player with the visible canvas
  player = new EP(canvas) as EmotePlayerInstance
  playerCreated = true
  return player
}

async function loadModel(url: string) {
  componentState.value = 'loading'

  try {
    const p = await ensurePlayer()
    if (!p) {
      componentState.value = 'pending'
      return
    }

    // Unload previous model if any
    if (p.initialized) {
      p.unloadData()
    }

    // Load model from URL
    await p.promiseLoadDataFromURL(url)

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
  if (player && v !== undefined) {
    player.setVariable('mouth_open', v * 30, 50)
  }
})

watch(() => props.cursorPosition, (pos) => {
  if (player && pos) {
    const x = (pos.x / window.innerWidth) * 2 - 1
    const y = (pos.y / window.innerHeight) * 2 - 1
    player.setVariable('head_lr', x * 30, 100)
    player.setVariable('head_ud', y * 30, 100)
  }
})

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
