<script setup lang="ts">
import type { EmotePlayerInstance } from '../../../utils/emote-loader'

import { onMounted, onUnmounted, ref, watch } from 'vue'

import { loadEmoteDriver } from '../../../utils/emote-loader'

const props = defineProps<{
  modelSrc?: string
  modelId?: string
  canvas?: HTMLCanvasElement
  paused?: boolean
  mouthOpenSize?: number
  cursorPosition?: { x: number, y: number }
}>()

const emit = defineEmits<{
  'update:state': [state: 'pending' | 'loading' | 'mounted']
  'ready': [timelines: string[]]
}>()

const modelState = ref<'pending' | 'loading' | 'mounted'>('pending')
let player: EmotePlayerInstance | null = null

async function loadModel(url: string) {
  if (!props.canvas)
    return

  modelState.value = 'loading'
  emit('update:state', 'loading')

  try {
    await loadEmoteDriver()

    const EP = (window as any).EmotePlayer
    const canvas = props.canvas
    canvas.width = 1024
    canvas.height = 1024

    EP.createRenderCanvas(1024, 1024)
    player = new EP(canvas) as EmotePlayerInstance

    const res = await fetch(url)
    const data = new Uint8Array(await res.arrayBuffer())
    player.loadData(data)

    modelState.value = 'mounted'
    emit('update:state', 'mounted')

    const timelines: string[] = player.mainTimelineLabels || []
    emit('ready', timelines)
  }
  catch (err) {
    console.error('[Emote] Failed to load model:', err)
    modelState.value = 'pending'
    emit('update:state', 'pending')
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

watch(() => props.paused, (paused) => {
  if (!player)
    return
  if (paused)
    player.pause?.()
  else
    player.resume?.()
})

onUnmounted(() => {
  player?.unloadData?.()
  player = null
})

defineExpose({
  setEmotion: (emotion: string, _intensity?: number) => {
    player?.playTimeline?.(emotion)
  },
  playTimeline: (label: string) => {
    player?.playTimeline?.(label)
  },
  setVariable: (name: string, value: number, duration?: number) => {
    player?.setVariable?.(name, value, duration ?? 0)
  },
  setScale: (scale: number, duration?: number) => {
    player?.setScale?.(scale, duration ?? 0)
  },
  setCoord: (x: number, y: number, duration?: number) => {
    player?.setCoord?.(x, y, duration ?? 0)
  },
  listTimelines: () => player?.mainTimelineLabels ?? [],
})
</script>

<template>
  <div style="display: none;" />
</template>
