<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  resolution?: number
}>(), {
  width: 1024,
  height: 1024,
  resolution: 1,
})

const canvasRef = ref<HTMLCanvasElement>()

defineExpose({
  canvasElement: () => canvasRef.value,
  captureFrame: () => {
    const canvas = canvasRef.value
    if (!canvas)
      return Promise.resolve(null)
    return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  },
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="props.width * props.resolution"
    :height="props.height * props.resolution"
    :style="{ width: `${props.width}px`, height: `${props.height}px` }"
    style="display: block; margin: auto;"
  />
</template>
