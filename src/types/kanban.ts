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
}

export const STORAGE_KEY = 'thekanban:v1'

/** Doing column work-in-progress hard limit */
export const DOING_WIP_LIMIT = 3

export const DOING_COLUMN_ID = 'doing'
