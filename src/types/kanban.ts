export interface Card {
  id: string
  title: string
  note?: string
}

export interface Column {
  id: string
  title: string
  cardIds: string[]
}

export interface KanbanState {
  columns: Column[]
  cards: Record<string, Card>
  /** Ordered focus in Doing: index 0 = strong, index 1 = weak. Max FOCUS_MAX. */
  focusIds?: string[]
}

export const STORAGE_KEY = 'thekanban:v1'

/** Doing column work-in-progress hard limit */
export const DOING_WIP_LIMIT = 3

/** Max cards marked as currently focused (first = stronger vibe). */
export const FOCUS_MAX = 2

export const DOING_COLUMN_ID = 'doing'

/** 0 = none, 1 = primary (strong), 2 = secondary (weak) */
export type FocusRank = 0 | 1 | 2
