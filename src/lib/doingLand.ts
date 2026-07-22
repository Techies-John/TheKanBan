import { ref } from 'vue'

/** Ephemeral: card ids that just landed in Doing (comic bounce). Not persisted. */
const landingIds = ref<Set<string>>(new Set())
let clearTimer: ReturnType<typeof setTimeout> | null = null

export function markCardsLandingIntoDoing(ids: string[]): void {
  if (!ids.length) return
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
  landingIds.value = new Set(ids)
  clearTimer = setTimeout(() => {
    landingIds.value = new Set()
    clearTimer = null
  }, 520)
}

export function isCardLandingIntoDoing(cardId: string): boolean {
  return landingIds.value.has(cardId)
}

export function useDoingLandingIds() {
  return landingIds
}
