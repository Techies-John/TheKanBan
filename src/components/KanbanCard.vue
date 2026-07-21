<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useKanbanStore } from '../stores/kanbanStore'
import gripIcon from '../assets/pixel/icons/grip-16.png'

const props = defineProps<{
  cardId: string
}>()

const store = useKanbanStore()
const card = computed(() => store.cards[props.cardId])

const menuOpen = ref(false)
const menuWrap = ref<HTMLElement | null>(null)
const editing = ref(false)
const draftTitle = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

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
  // Defer so the opening click doesn't immediately close the menu
  nextTick(() => {
    if (menuOpen.value) {
      document.addEventListener('pointerdown', onDocPointerDown, true)
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})

async function startEdit() {
  if (!card.value) return
  closeMenu()
  editing.value = true
  draftTitle.value = card.value.title
  await nextTick()
  titleInput.value?.focus()
  titleInput.value?.select()
}

function commitEdit() {
  store.updateCard(props.cardId, { title: draftTitle.value })
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
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
  <article v-if="card" class="card" :class="{ editing }">
    <div class="card-main">
      <img class="card-grip" :src="gripIcon" width="16" height="16" alt="" aria-hidden="true" title="Drag" />

      <form v-if="editing" class="card-edit" @submit.prevent="commitEdit">
        <input
          ref="titleInput"
          v-model="draftTitle"
          class="card-edit-input"
          type="text"
          maxlength="120"
          aria-label="Edit card title"
          @keydown="onEditKeydown"
          @blur="commitEdit"
        />
      </form>

      <p v-else class="card-title" @dblclick="startEdit">{{ card.title }}</p>
    </div>

    <div ref="menuWrap" class="card-menu-wrap">
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
        <button type="button" role="menuitem" @click="startEdit">Edit</button>
        <button type="button" role="menuitem" class="danger" @click="confirmDelete">Delete</button>
      </div>
    </div>
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
  cursor: grab;
  user-select: none;
}

.card:active {
  cursor: grabbing;
}

.card.editing {
  cursor: default;
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
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-edit {
  flex: 1;
  min-width: 0;
}

.card-edit-input {
  width: 100%;
  padding: 0.25rem 0.4rem;
  border: 2px solid var(--color-accent);
  border-radius: 6px;
  background: var(--color-paper);
  font-weight: 700;
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
  min-width: 7rem;
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
