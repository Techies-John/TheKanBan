<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useKanbanStore } from '../stores/kanbanStore'
import gripIcon from '../assets/pixel/icons/grip-16.png'
import PaperNoteModal from './PaperNoteModal.vue'

const props = defineProps<{
  cardId: string
}>()

const store = useKanbanStore()
const card = computed(() => store.cards[props.cardId])
const hasNote = computed(() => Boolean(card.value?.note?.trim()))

const menuOpen = ref(false)
const menuWrap = ref<HTMLElement | null>(null)
const noteOpen = ref(false)

function closeMenu() {
  menuOpen.value = false
}

function onDocPointerDown(e: PointerEvent) {
  if (!menuOpen.value || !menuWrap.value) return
  const target = e.target
  if (target instanceof Node && menuWrap.value.contains(target)) return
  closeMenu()
}

watch(menuOpen, (open) => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  if (!open) return
  nextTick(() => {
    if (menuOpen.value) {
      document.addEventListener('pointerdown', onDocPointerDown, true)
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})

function openNote() {
  closeMenu()
  noteOpen.value = true
}

function closeNote() {
  noteOpen.value = false
}

function confirmDelete() {
  closeMenu()
  if (window.confirm('Delete this card?')) {
    store.removeCard(props.cardId)
  }
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
</script>

<template>
  <article
    v-if="card"
    class="card"
    :class="{ 'has-note': hasNote }"
  >
    <div class="card-main">
      <img
        class="card-grip"
        :src="gripIcon"
        width="16"
        height="16"
        alt=""
        aria-hidden="true"
        title="Drag"
      />

      <button
        type="button"
        class="card-title card-no-drag"
        :title="card.title"
        @click="openNote"
      >
        {{ card.title }}
      </button>
      <span
        v-if="hasNote"
        class="note-dot"
        title="Has a scrap note"
        aria-hidden="true"
      />
    </div>

    <div ref="menuWrap" class="card-menu-wrap card-no-drag">
      <button
        type="button"
        class="card-menu-btn"
        aria-label="Card actions"
        aria-haspopup="true"
        :aria-expanded="menuOpen"
        @click.stop="toggleMenu"
      >
        ⋮
      </button>
      <div v-if="menuOpen" class="card-menu" role="menu">
        <button type="button" role="menuitem" @click="openNote">Open note</button>
        <button type="button" role="menuitem" class="danger" @click="confirmDelete">Delete</button>
      </div>
    </div>

    <PaperNoteModal
      v-if="noteOpen"
      :card-id="cardId"
      @close="closeNote"
    />
  </article>
</template>

<style scoped>
.card {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 0.65rem 0.55rem 0.65rem 0.45rem;
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-ink);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-cartoon);
  user-select: none;
  cursor: grab;
}

.card:active {
  cursor: grabbing;
}

.card-main {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.card-grip {
  flex-shrink: 0;
  margin-top: 0.15rem;
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}

.card-title {
  /* Hit target = text only; leftover row space stays draggable (GitHub-style) */
  flex: 0 1 auto;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0.1rem 0.15rem;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: inherit;
  cursor: pointer;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-title:hover {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 2px;
}

.card-title:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.note-dot {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.45rem;
  border: 2px solid var(--color-ink);
  border-radius: 2px;
  background: var(--color-peach);
  box-shadow: 1px 1px 0 var(--color-ink);
}

.card-menu-wrap {
  position: relative;
  flex-shrink: 0;
}

.card-menu-btn {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1;
  color: var(--color-ink-muted);
  cursor: pointer;
}

.card-menu-btn:hover,
.card-menu-btn[aria-expanded='true'] {
  border-color: var(--color-ink);
  background: var(--color-paper);
  color: var(--color-ink);
}

.card-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 7.5rem;
  padding: 0.25rem;
  background: var(--color-surface);
  border: var(--border-width) solid var(--color-ink);
  border-radius: 8px;
  box-shadow: var(--shadow-cartoon);
}

.card-menu button {
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.card-menu button:hover {
  background: var(--color-peach);
}

.card-menu button.danger {
  color: var(--color-danger);
}

.card-menu button.danger:hover {
  background: color-mix(in srgb, var(--color-danger) 12%, white);
}
</style>
