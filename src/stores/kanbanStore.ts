import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Card, Column, FocusRank, KanbanState } from '../types/kanban'
import {
  DOING_COLUMN_ID,
  DOING_WIP_LIMIT,
  FOCUS_MAX,
  STORAGE_KEY,
} from '../types/kanban'

function uid(): string {
  return crypto.randomUUID()
}

function defaultState(): KanbanState {
  const c1 = uid()
  const c2 = uid()
  const c3 = uid()
  return {
    columns: [
      { id: 'todo', title: 'To Do', cardIds: [c1] },
      { id: 'doing', title: 'Doing', cardIds: [c2] },
      { id: 'done', title: 'Done', cardIds: [c3] },
    ],
    cards: {
      [c1]: { id: c1, title: 'Sketch the comic board' },
      [c2]: { id: c2, title: 'Drag a card over here' },
      [c3]: { id: c3, title: 'Ship v1' },
    },
    focusIds: [],
  }
}

function doingIdsFrom(state: KanbanState): string[] {
  return state.columns.find((c) => c.id === DOING_COLUMN_ID)?.cardIds ?? []
}

function sanitizeFocusIds(
  ids: string[] | undefined,
  state: KanbanState,
): string[] {
  const doing = new Set(doingIdsFrom(state))
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids ?? []) {
    if (!doing.has(id) || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= FOCUS_MAX) break
  }
  return out
}

function loadState(): KanbanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as KanbanState
    if (!parsed?.columns?.length || !parsed.cards) return defaultState()
    return {
      ...parsed,
      focusIds: sanitizeFocusIds(parsed.focusIds, parsed),
    }
  } catch {
    return defaultState()
  }
}

export const useKanbanStore = defineStore('kanban', () => {
  const initial = loadState()
  const columns = ref<Column[]>(initial.columns)
  const cards = ref<Record<string, Card>>(initial.cards)
  const focusIds = ref<string[]>([...(initial.focusIds ?? [])])

  const totalCards = computed(() => Object.keys(cards.value).length)

  function persist() {
    const payload: KanbanState = {
      columns: columns.value,
      cards: cards.value,
      focusIds: focusIds.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  watch([columns, cards, focusIds], persist, { deep: true })

  function getCardIds(columnId: string): string[] {
    return columns.value.find((c) => c.id === columnId)?.cardIds ?? []
  }

  function isDoingFull(): boolean {
    return getCardIds(DOING_COLUMN_ID).length >= DOING_WIP_LIMIT
  }

  function canAcceptCard(columnId: string, nextCount: number): boolean {
    if (columnId !== DOING_COLUMN_ID) return true
    return nextCount <= DOING_WIP_LIMIT
  }

  function syncFocusToDoing() {
    const doing = new Set(getCardIds(DOING_COLUMN_ID))
    const next = focusIds.value.filter((id) => doing.has(id))
    if (
      next.length !== focusIds.value.length ||
      next.some((id, i) => id !== focusIds.value[i])
    ) {
      focusIds.value = next
    }
  }

  function setCardIds(columnId: string, ids: string[]) {
    const col = columns.value.find((c) => c.id === columnId)
    if (!col) return
    if (!canAcceptCard(columnId, ids.length)) return
    // Replace as a new array so watchers see a clean commit after drag
    col.cardIds = [...ids]
    syncFocusToDoing()
  }

  /** Apply several column id lists in one turn (post-drag flush). */
  function commitColumnCardIds(updates: Record<string, string[]>) {
    const doingIds = updates[DOING_COLUMN_ID]
    if (doingIds && !canAcceptCard(DOING_COLUMN_ID, doingIds.length)) {
      return false
    }
    for (const [columnId, ids] of Object.entries(updates)) {
      const col = columns.value.find((c) => c.id === columnId)
      if (!col) continue
      if (!canAcceptCard(columnId, ids.length)) continue
      col.cardIds = [...ids]
    }
    syncFocusToDoing()
    return true
  }

  function addCard(columnId: string, title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    const col = columns.value.find((c) => c.id === columnId)
    if (!col) return
    if (!canAcceptCard(columnId, col.cardIds.length + 1)) return
    const id = uid()
    cards.value[id] = { id, title: trimmed }
    col.cardIds.push(id)
  }

  function updateCard(cardId: string, patch: Partial<Pick<Card, 'title' | 'note'>>) {
    const card = cards.value[cardId]
    if (!card) return
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim()
      if (!trimmed) return
      card.title = trimmed
    }
    if (patch.note !== undefined) {
      card.note = patch.note.trim() || undefined
    }
  }

  function removeCard(cardId: string) {
    for (const col of columns.value) {
      col.cardIds = col.cardIds.filter((id) => id !== cardId)
    }
    delete cards.value[cardId]
    focusIds.value = focusIds.value.filter((id) => id !== cardId)
  }

  function focusRank(cardId: string): FocusRank {
    const i = focusIds.value.indexOf(cardId)
    if (i === 0) return 1
    if (i === 1) return 2
    return 0
  }

  function isFocused(cardId: string): boolean {
    return focusIds.value.includes(cardId)
  }

  /**
   * Toggle focus for a Doing card.
   * Order = focus order: first focused = strong, second = weak.
   * At max: keep primary, replace secondary with the new card.
   */
  function toggleFocus(cardId: string) {
    if (!getCardIds(DOING_COLUMN_ID).includes(cardId)) return
    const idx = focusIds.value.indexOf(cardId)
    if (idx >= 0) {
      focusIds.value = focusIds.value.filter((id) => id !== cardId)
      return
    }
    if (focusIds.value.length < FOCUS_MAX) {
      focusIds.value = [...focusIds.value, cardId]
      return
    }
    const primary = focusIds.value[0]
    if (!primary) {
      focusIds.value = [cardId]
      return
    }
    focusIds.value = [primary, cardId]
  }

  return {
    columns,
    cards,
    focusIds,
    totalCards,
    getCardIds,
    setCardIds,
    commitColumnCardIds,
    addCard,
    updateCard,
    removeCard,
    isDoingFull,
    canAcceptCard,
    focusRank,
    isFocused,
    toggleFocus,
  }
})
