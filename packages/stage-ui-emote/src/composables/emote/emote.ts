import { ref } from 'vue'

/**
 * Composable for managing E-mote player parameters at runtime.
 *
 * Provides reactive refs that the Stage component can bind to,
 * mirroring the pattern used by `useLive2dParams`.
 */
export function useEmoteParams() {
  const currentTimeline = ref<string>('')
  const mouthOpen = ref(0)
  const headX = ref(0)
  const headY = ref(0)

  function setTimeline(label: string) {
    currentTimeline.value = label
  }

  function setMouthOpen(value: number) {
    mouthOpen.value = Math.max(0, Math.min(1, value))
  }

  function setHead(x: number, y: number) {
    headX.value = x
    headY.value = y
  }

  return {
    currentTimeline,
    mouthOpen,
    headX,
    headY,
    setTimeline,
    setMouthOpen,
    setHead,
  }
}
