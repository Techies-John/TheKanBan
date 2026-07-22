<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useKanbanStore } from '../stores/kanbanStore.ts'
import type { Column } from '../types/kanban.ts'
import {
  DOING_COLUMN_ID,
  DOING_WIP_LIMIT,
} from '../types/kanban.ts'
import {
  randomRejectLine,
  vibeForDoingCount,
} from '../constants/doingWipMessages.ts'
import {
  allowCrossColumnMove,
  armRejectOnce,
  beginDragSession,
  endDragSession,
  isDragSessionActive,
  noteColumnIds,
} from '../lib/dragSession.ts'
import { markCardsLandingIntoDoing } from '../lib/doingLand.ts'
import KanbanCard from './KanbanCard.vue'
import KanbanWipBanter from './KanbanWipBanter.vue'
import emptyDoodle from '../assets/pixel/ui/empty-column-64x48.png'
import addCardIcon from '../assets/pixel/icons/add-card-32.png'

const props = defineProps<{
  column: Column
  tint: 'peach' | 'sky' | 'mint'
}>()

const store = useKanbanStore()

/** Local list Sortable owns during a drag — Pinia only updates on drop. */
const localIds = ref<string[]>([...store.getCardIds(props.column.id)])

watch(
  () => store.getCardIds(props.column.id).join('\0'),
  () => {
    if (isDragSessionActive()) return
    localIds.value = [...store.getCardIds(props.column.id)]
  },
)

const isDoing = computed(() => props.column.id === DOING_COLUMN_ID)
const isFull = computed(
  () => isDoing.value && localIds.value.length >= DOING_WIP_LIMIT,
)
const isEmpty = computed(() => localIds.value.length === 0)

const vibeHeat = computed((): 1 | 2 | 3 | undefined => {
  const n = localIds.value.length
  if (n === 1 || n === 2 || n === 3) return n
  return undefined
})

const vibeMessage = computed(() =>
  isDoing.value ? vibeForDoingCount(localIds.value.length) : null,
)

const rejectMessage = ref<string | null>(null)
let rejectTimer: ReturnType<typeof setTimeout> | null = null
let lastRejectFlash = 0

function clearRejectTimer() {
  if (rejectTimer) {
    clearTimeout(rejectTimer)
    rejectTimer = null
  }
}

function flashReject() {
  if (!isDoing.value) return
  const now = Date.now()
  if (now - lastRejectFlash < 1600 && rejectMessage.value) return
  lastRejectFlash = now
  clearRejectTimer()
  rejectMessage.value = randomRejectLine()
  rejectTimer = setTimeout(() => {
    rejectMessage.value = null
    rejectTimer = null
  }, 2800)
}

const banterMessage = computed(() => {
  // Freeze vibe changes while Sortable is mid-flight (reject toast still allowed)
  if (isDragSessionActive() && !rejectMessage.value) {
    return vibeForDoingCount(store.getCardIds(DOING_COLUMN_ID).length)
  }
  return rejectMessage.value ?? vibeMessage.value
})
const banterVariant = computed<'vibe' | 'reject'>(() =>
  rejectMessage.value ? 'reject' : 'vibe',
)

onBeforeUnmount(() => {
  clearRejectTimer()
})

function canPutInColumn(): boolean {
  if (props.column.id !== DOING_COLUMN_ID) return true
  return localIds.value.length < DOING_WIP_LIMIT
}

/** Stable group object — recreating it every render re-inits Sortable and causes flicker. */
const dragGroup = {
  name: 'thekanban',
  put: () => {
    const allowed = canPutInColumn()
    if (!allowed && armRejectOnce(true)) {
      flashReject()
    }
    if (allowed) armRejectOnce(false)
    return allowed
  },
}

function onDragStart() {
  beginDragSession(props.column.id)
  noteColumnIds(props.column.id, localIds.value)
}

function onLocalIdsUpdate(ids: string[]) {
  localIds.value = ids
  if (isDragSessionActive()) {
    noteColumnIds(props.column.id, ids)
  }
}

function flushDragToStore() {
  const doingBefore = new Set(store.getCardIds(DOING_COLUMN_ID))

  endDragSession((columnId, ids) => {
    store.setCardIds(columnId, ids)
  })
  // Resync this column from store (handles WIP reject / no-op)
  localIds.value = [...store.getCardIds(props.column.id)]

  const entered = store
    .getCardIds(DOING_COLUMN_ID)
    .filter((id) => !doingBefore.has(id))
  markCardsLandingIntoDoing(entered)
}

function onDragEnd() {
  flushDragToStore()
}

/** Kill border ping-pong: only transfer when pointer is clearly inside the target column. */
function onMove(
  evt: { from: HTMLElement; to: HTMLElement },
  originalEvent: Event,
): boolean {
  if (evt.from === evt.to) return true
  const toId = evt.to.dataset.columnId
  const fromId = evt.from.dataset.columnId
  if (!toId || !fromId) return true
  return allowCrossColumnMove(fromId, toId, evt.to, originalEvent)
}

const drafting = ref(false)
const draftTitle = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

async function startAdd() {
  if (isFull.value) {
    flashReject()
    return
  }
  drafting.value = true
  draftTitle.value = ''
  await nextTick()
  inputRef.value?.focus()
}

function commitAdd() {
  if (isFull.value) {
    flashReject()
    cancelAdd()
    return
  }
  store.addCard(props.column.id, draftTitle.value)
  localIds.value = [...store.getCardIds(props.column.id)]
  draftTitle.value = ''
  drafting.value = false
}

function cancelAdd() {
  draftTitle.value = ''
  drafting.value = false
}

function onAddKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    commitAdd()
  } else if (e.key === 'Escape') {
    cancelAdd()
  }
}
</script>

<template>
  <section
    class="column"
    :class="[`tint-${tint}`, { 'is-doing': isDoing, 'is-full': isFull }]"
    role="listitem"
    :aria-label="column.title"
  >
    <header class="column-header">
      <div class="column-heading">
        <span class="column-bullet" :class="`bullet-${tint}`" aria-hidden="true" />
        <h2 class="column-title">{{ column.title }}</h2>
        <span v-if="isDoing" class="wip-tag" title="Work in progress limit">WIP {{ DOING_WIP_LIMIT }}</span>
      </div>
      <span
        class="column-count"
        :class="{ full: isFull, pop: isDoing && !!vibeHeat }"
        :aria-label="
          isDoing
            ? `${localIds.length} of ${DOING_WIP_LIMIT} cards`
            : `${localIds.length} cards`
        "
      >
        <template v-if="isDoing">{{ localIds.length }}/{{ DOING_WIP_LIMIT }}</template>
        <template v-else>{{ localIds.length }}</template>
      </span>
    </header>

    <div class="banter-slot">
      <Transition name="banter-fade" mode="out-in">
        <KanbanWipBanter
          v-if="isDoing && banterMessage"
          :key="rejectMessage ? `reject-${rejectMessage}` : `vibe-${vibeHeat ?? 0}`"
          :message="banterMessage"
          :variant="banterVariant"
          :heat="rejectMessage ? undefined : vibeHeat"
        />
      </Transition>
    </div>

    <div class="column-list-wrap">
      <div v-if="isEmpty && !drafting" class="column-empty" aria-hidden="true">
        <img
          class="empty-doodle"
          :src="emptyDoodle"
          width="64"
          height="48"
          alt=""
        />
        <p>Nothing here — drop a card here.</p>
      </div>

      <VueDraggable
        :model-value="localIds"
        class="column-list"
        :class="{ empty: isEmpty }"
        :data-column-id="column.id"
        :group="dragGroup"
        :animation="120"
        :empty-insert-threshold="40"
        :swap-threshold="0.65"
        :invert-swap="true"
        :force-fallback="true"
        :fallback-on-body="true"
        :fallback-tolerance="4"
        filter=".card-no-drag"
        :prevent-on-filter="false"
        :move="onMove"
        ghost-class="card-ghost"
        chosen-class="card-chosen"
        drag-class="card-drag"
        fallback-class="card-fallback"
        @update:model-value="onLocalIdsUpdate"
        @start="onDragStart"
        @end="onDragEnd"
      >
        <KanbanCard
          v-for="id in localIds"
          :key="id"
          :card-id="id"
          :in-doing="isDoing"
        />
      </VueDraggable>
    </div>

    <div class="column-footer">
      <button
        v-if="isDoing && isFull && !drafting"
        type="button"
        class="btn btn-full-hint"
        @click="flashReject"
      >
        Stove's full — tap for a nudge
      </button>
      <form v-else-if="drafting" class="add-form" @submit.prevent="commitAdd">
        <input
          ref="inputRef"
          v-model="draftTitle"
          class="add-input"
          type="text"
          maxlength="120"
          placeholder="Card title"
          aria-label="New card title"
          @keydown="onAddKeydown"
        />
        <div class="add-actions">
          <button type="submit" class="btn btn-primary">Add</button>
          <button type="button" class="btn btn-ghost" @click="cancelAdd">Cancel</button>
        </div>
      </form>
      <button
        v-else
        type="button"
        class="btn btn-add"
        @click.stop="startAdd"
      >
        <img class="pixel-icon add-icon" :src="addCardIcon" width="20" height="20" alt="" aria-hidden="true" />
        Add card
      </button>
    </div>
  </section>
</template>

<style scoped>
.column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
  min-height: 0;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  padding: 0.85rem 0.9rem 1rem;
  background: var(--color-paper);
  border: var(--border-width) solid var(--color-ink);
  border-right-width: 0;
}

.column:last-child {
  border-right-width: var(--border-width);
}

.column.tint-peach {
  background: color-mix(in srgb, var(--color-peach) 55%, var(--color-paper));
}

.column.tint-sky {
  background: color-mix(in srgb, var(--color-sky) 55%, var(--color-paper));
}

.column.tint-mint {
  background: color-mix(in srgb, var(--color-mint) 55%, var(--color-paper));
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid var(--color-ink);
  flex-shrink: 0;
}

.column-heading {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex-wrap: wrap;
}

.column-bullet {
  flex-shrink: 0;
  width: 0.7rem;
  height: 0.7rem;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  box-shadow: 1.5px 1.5px 0 var(--color-ink);
}

.column-bullet.bullet-peach {
  background: var(--color-peach);
}

.column-bullet.bullet-sky {
  background: var(--color-sky);
}

.column-bullet.bullet-mint {
  background: var(--color-mint);
}

.column-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
}

.wip-tag {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.12rem 0.4rem;
  border: 2px solid var(--color-ink);
  border-radius: 6px;
  background: var(--color-peach);
}

.pixel-icon {
  flex-shrink: 0;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.add-icon {
  width: 20px;
  height: 20px;
}

.column-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  height: 1.6rem;
  padding: 0 0.4rem;
  border: 2px solid var(--color-ink);
  border-radius: 999px;
  background: var(--color-surface);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.column-count.full {
  background: var(--color-accent);
  color: #fff;
}

.column-count.pop {
  box-shadow: 2px 2px 0 var(--color-ink);
}

.column-list-wrap {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.column-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1 1 0;
  min-height: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0.15rem 0.2rem 0.25rem 0.1rem;
  scrollbar-width: auto;
  scrollbar-color: var(--color-accent) var(--color-paper);
}

.column-list.empty {
  min-height: 0;
}

.column-list::-webkit-scrollbar {
  width: 14px;
}

.column-list::-webkit-scrollbar-track {
  background: var(--color-paper);
  border: 2px solid var(--color-ink);
  border-radius: 8px;
  box-shadow: inset 1px 1px 0 rgba(45, 42, 38, 0.15);
}

.column-list::-webkit-scrollbar-thumb {
  background: var(--color-accent);
  border: 2px solid var(--color-ink);
  border-radius: 8px;
  box-shadow: 2px 2px 0 var(--color-ink);
}

.column-list::-webkit-scrollbar-thumb:hover {
  background: var(--color-accent-hover);
}

.column-list::-webkit-scrollbar-button {
  display: none;
  height: 0;
  width: 0;
}

.column-empty {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.5rem 0.35rem;
  color: var(--color-ink-muted);
  font-size: 0.95rem;
  text-align: center;
  pointer-events: none;
}

.column-empty p {
  margin: 0;
}

.empty-doodle {
  width: 64px;
  height: 48px;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.column-footer {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  margin-top: 0;
}

.btn {
  border: var(--border-width) solid var(--color-ink);
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  font-weight: 700;
  background: var(--color-surface);
  box-shadow: 2px 2px 0 var(--color-ink);
}

.btn:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-ink);
}

.btn-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  background: var(--color-accent);
  color: #fff;
}

.btn-add:hover {
  background: var(--color-accent-hover);
}

.btn-full-hint {
  width: 100%;
  background: var(--color-peach);
}

.btn-full-hint:hover {
  background: color-mix(in srgb, var(--color-accent) 20%, var(--color-peach));
}

.btn-primary {
  background: var(--color-accent);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

.btn-ghost {
  background: var(--color-surface);
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: var(--border-width) solid var(--color-ink);
  border-radius: 8px;
  background: var(--color-surface);
}

.add-actions {
  display: flex;
  gap: 0.5rem;
}

.banter-slot {
  flex-shrink: 0;
}

.banter-fade-enter-active,
.banter-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.banter-fade-enter-from,
.banter-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* Keep WIP banter from eating the flex chain */
.column :deep(.banter) {
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .column {
    flex: 0 0 min(85vw, 320px);
    height: 100%;
    max-height: 100%;
    scroll-snap-align: start;
    border-right-width: var(--border-width);
  }

  .column + .column {
    margin-left: -2.5px;
  }
}

:deep(.card-ghost) {
  opacity: 0.45;
}

:deep(.card-chosen) {
  cursor: grabbing;
}

:deep(.card-drag),
:deep(.card-fallback) {
  box-shadow: var(--shadow-lift);
  transform: rotate(-1.5deg);
  cursor: grabbing;
  opacity: 0.95;
}
</style>
