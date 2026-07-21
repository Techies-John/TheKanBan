<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useKanbanStore } from '../stores/kanbanStore.ts'
import KanbanColumn from './KanbanColumn.vue'
import faviconMark from '../assets/pixel/icons/favicon-16.png'

const store = useKanbanStore()
const { columns, totalCards } = storeToRefs(store)
</script>

<template>
  <div class="board-shell">
    <header class="board-header">
      <div class="board-brand">
        <img
          class="board-mark"
          :src="faviconMark"
          width="32"
          height="32"
          alt=""
          aria-hidden="true"
        />
        <h1 class="board-title">TheKanBan</h1>
      </div>
      <p class="board-meta">{{ totalCards }} card{{ totalCards === 1 ? '' : 's' }}</p>
    </header>

    <div class="board-columns" role="list">
      <KanbanColumn
        v-for="(column, index) in columns"
        :key="column.id"
        :column="column"
        :tint="index === 0 ? 'peach' : index === 1 ? 'sky' : 'mint'"
      />
    </div>
  </div>
</template>

<style scoped>
.board-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100svh;
  max-height: 100svh;
  overflow: hidden;
  padding: 1rem 1.25rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

.board-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: var(--border-width) solid var(--color-ink);
  flex-shrink: 0;
}

.board-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.board-mark {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  flex-shrink: 0;
}

.board-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  letter-spacing: 0.02em;
  line-height: 1.1;
}

.board-meta {
  margin: 0;
  font-weight: 700;
  color: var(--color-ink-muted);
  white-space: nowrap;
}

.board-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr);
  gap: 0;
  flex: 1 1 0;
  min-height: 0;
  align-items: stretch;
  overflow: hidden;
}

@media (max-width: 900px) {
  .board-columns {
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    gap: 0;
    padding-bottom: 0.5rem;
    align-items: stretch;
  }
}
</style>
