<script setup lang="ts">
import type { Emotion } from '../../constants/emotions'

import { Screen } from '@proj-airi/ui'
import { ref, watch } from 'vue'

import EmoteCanvas from './emote/Canvas.vue'
import EmoteModel from './emote/Model.vue'

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
const componentStateCanvas = defineModel<'pending' | 'loading' | 'mounted'>('canvasState', { default: 'pending' })
const componentStateModel = defineModel<'pending' | 'loading' | 'mounted'>('modelState', { default: 'pending' })

const canvasRef = ref<InstanceType<typeof EmoteCanvas>>()
const modelRef = ref<InstanceType<typeof EmoteModel>>()

watch([componentStateModel, componentStateCanvas], () => {
  componentState.value = (componentStateModel.value === 'mounted' && componentStateCanvas.value === 'mounted')
    ? 'mounted'
    : 'loading'
})

defineExpose({
  canvasElement: () => canvasRef.value?.canvasElement(),
  captureFrame: () => canvasRef.value?.captureFrame(),
  setEmotion: (emotion: Emotion, _intensity?: number) => {
    const timeline = EMOTION_EmoteTimelineName_value[emotion]
    modelRef.value?.playTimeline(timeline)
  },
  playTimeline: (label: string) => modelRef.value?.playTimeline(label),
  setVariable: (name: string, value: number, duration?: number) => modelRef.value?.setVariable(name, value, duration),
  setScale: (scale: number, duration?: number) => modelRef.value?.setScale(scale, duration),
  setCoord: (x: number, y: number, duration?: number) => modelRef.value?.setCoord(x, y, duration),
  listTimelines: () => modelRef.value?.listTimelines() ?? [],
})
</script>

<template>
  <Screen v-slot="{ width, height }" relative>
    <EmoteCanvas
      ref="canvasRef"
      v-model:state="componentStateCanvas"
      :width="width"
      :height="height"
      :resolution="props.renderScale"
      max-h="100dvh"
    />
    <EmoteModel
      ref="modelRef"
      v-model:state="componentStateModel"
      :model-src="props.modelSrc"
      :model-id="props.modelId"
      :canvas="canvasRef?.canvasElement()"
      :paused="props.paused"
      :mouth-open-size="props.mouthOpenSize"
      :cursor-position="props.cursorPosition"
    />
  </Screen>
</template>
