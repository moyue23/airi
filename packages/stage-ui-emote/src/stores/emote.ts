import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * E-mote runtime settings store.
 *
 * Mirrors the pattern used by Live2D and Spine settings stores:
 * renderer-specific options that the Stage component reads via
 * `storeToRefs` and passes down as props.
 */
export const useSettingsEmote = defineStore('settings-emote', () => {
  const emoteMaxFps = ref(0)
  const emoteRenderScale = ref(1)
  const emoteMemoryMb = ref(256)

  return {
    emoteMaxFps,
    emoteRenderScale,
    emoteMemoryMb,
  }
})
