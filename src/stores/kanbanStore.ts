import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Card, Column, KanbanState } from '../types/kanban'
import { DOING_COLUMN_ID, DOING_WIP_LIMIT, STORAGE_KEY } from '../types/kanban'

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
  }
}

function loadState(): KanbanState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as KanbanState
    if (!parsed?.columns?.length || !parsed.cards) return defaultState()
    return parsed
  } catch {
    return defaultState()
  }
}

export const useKanbanStore = defineStore('kanban', () => {
  const initial = loadState()
  const columns = ref<Column[]>(initial.columns)
  const cards = ref<Record<string, Card>>(initial.cards)

  const totalCards = computed(() => Object.keys(cards.value).length)

  function persist() {
    const payload: KanbanState = {
      columns: columns.value,
      cards: cards.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  watch([columns, cards], persist, { deep: true })

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

  function setCardIds(columnId: string, ids: string[]) {
    const col = columns.value.find((c) => c.id === columnId)
    if (!col) return
    if (!canAcceptCard(columnId, ids.length)) return
    // Replace as a new array so watchers see a clean commit after drag
    col.cardIds = [...ids]
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
  }

  return {
    columns,
    cards,
    totalCards,
    getCardIds,
    setCardIds,
    commitColumnCardIds,
    addCard,
    updateCard,
    removeCard,
    isDoingFull,
    canAcceptCard,
  }
})
