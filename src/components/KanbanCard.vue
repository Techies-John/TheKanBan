<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useKanbanStore } from '../stores/kanbanStore'
import { shouldSuppressCardTitleClick } from '../lib/dragSession'
import { useDoingLandingIds } from '../lib/doingLand'
import gripIcon from '../assets/pixel/icons/grip-16.png'
import PaperNoteModal from './PaperNoteModal.vue'

const CLICK_MOVE_THRESHOLD_PX = 8

const props = defineProps<{
  cardId: string
  inDoing?: boolean
}>()

const store = useKanbanStore()
const landingIds = useDoingLandingIds()
const card = computed(() => store.cards[props.cardId])
const hasNote = computed(() => Boolean(card.value?.note?.trim()))
const landing = computed(() => landingIds.value.has(props.cardId))
const focusRank = computed(() => store.focusRank(props.cardId))
const isFocused = computed(() => focusRank.value > 0)
const focusDimmed = computed(
  () =>
    Boolean(props.inDoing) &&
    store.focusIds.length > 0 &&
    !isFocused.value,
)

const menuOpen = ref(false)
const menuWrap = ref<HTMLElement | null>(null)
const noteOpen = ref(false)

type Press = { x: number; y: number; id: number }
const titlePress = ref<Press | null>(null)

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
  clearTitlePressListeners()
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

function onFocusClick() {
  store.toggleFocus(props.cardId)
}

function clearTitlePressListeners() {
  window.removeEventListener('pointerup', onTitlePointerUp, true)
  window.removeEventListener('pointercancel', onTitlePointerCancel, true)
}

function onTitlePointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  // Let Sortable see this event for drag; we only decide click on pointerup
  titlePress.value = { x: e.clientX, y: e.clientY, id: e.pointerId }
  window.addEventListener('pointerup', onTitlePointerUp, true)
  window.addEventListener('pointercancel', onTitlePointerCancel, true)
}

function onTitlePointerCancel() {
  titlePress.value = null
  clearTitlePressListeners()
}

function onTitlePointerUp(e: PointerEvent) {
  const press = titlePress.value
  titlePress.value = null
  clearTitlePressListeners()
  if (!press || e.pointerId !== press.id) return
  if (shouldSuppressCardTitleClick()) return
  const dist = Math.hypot(e.clientX - press.x, e.clientY - press.y)
  if (dist > CLICK_MOVE_THRESHOLD_PX) return
  openNote()
}

function onTitleClick(e: MouseEvent) {
  // Handled via pointerup (click-vs-drag); block native click double-fire
  e.preventDefault()
}
</script>

<template>
  <article
    v-if="card"
    class="card"
    :class="{
      'has-note': hasNote,
      'card-land': landing,
      'focus-primary': focusRank === 1,
      'focus-secondary': focusRank === 2,
      'focus-dimmed': focusDimmed,
    }"
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
        class="card-title"
        :title="card.title"
        @pointerdown="onTitlePointerDown"
        @click="onTitleClick"
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

    <div class="card-actions card-no-drag">
      <button
        v-if="inDoing && !isFocused"
        type="button"
        class="focus-btn"
        :aria-pressed="false"
        title="Mark as currently doing"
        aria-label="Focus this card"
        @click.stop="onFocusClick"
      >
        <span class="focus-star" aria-hidden="true">★</span>
      </button>

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
          <button type="button" role="menuitem" @click="openNote">Open note</button>
          <button type="button" role="menuitem" class="danger" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>

    <!-- Focus lives on the card as a corner stamp — not a box on top of it -->
    <button
      v-if="inDoing && isFocused"
      type="button"
      class="focus-stamp card-no-drag"
      :class="{ primary: focusRank === 1, secondary: focusRank === 2 }"
      :aria-pressed="true"
      :title="
        focusRank === 1
          ? 'Primary focus — click to clear'
          : 'Secondary focus — click to clear'
      "
      aria-label="Clear focus"
      @click.stop="onFocusClick"
    >
      <span aria-hidden="true">★</span>
    </button>

    <PaperNoteModal
      v-if="noteOpen"
      :card-id="cardId"
      @close="closeNote"
    />
  </article>
</template>

<style scoped>
.card {
  position: relative;
  z-index: 0;
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
  transition:
    opacity 0.2s ease,
    filter 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
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

.card-actions {
  display: flex;
  align-items: flex-start;
  gap: 0.15rem;
  flex-shrink: 0;
}

.focus-btn {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
  line-height: 1;
}

.focus-btn:hover {
  border-color: var(--color-ink);
  background: var(--color-peach);
  color: var(--color-accent);
}

.focus-star {
  font-size: 1rem;
  display: block;
}

/* Corner stamp — priority is part of the card paper, not a floating box */
.focus-stamp {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  padding: 0;
  margin: 0;
  border: none;
  border-left: 2px solid var(--color-ink);
  border-top: 2px solid var(--color-ink);
  border-radius: 0.55rem 0 var(--radius-card) 0;
  cursor: pointer;
  line-height: 1;
  font-size: 0.95rem;
}

.focus-stamp.primary {
  background: var(--color-accent);
  color: #fff;
  animation: stamp-pulse-strong 1.8s ease-in-out infinite;
}

.focus-stamp.secondary {
  background: color-mix(in srgb, var(--color-peach) 70%, var(--color-accent));
  color: var(--color-ink);
  animation: stamp-pulse-weak 1.9s ease-in-out infinite;
}

.focus-stamp:hover {
  filter: brightness(1.05);
}

.focus-stamp:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

@keyframes stamp-pulse-strong {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.12);
  }
}

@keyframes stamp-pulse-weak {
  0%,
  100% {
    filter: brightness(1);
    opacity: 0.92;
  }
  50% {
    filter: brightness(1.08);
    opacity: 1;
  }
}

.card.focus-primary,
.card.focus-secondary {
  /* Room for left stripe + bottom-right stamp */
  padding-left: 0.65rem;
  padding-right: 0.55rem;
  padding-bottom: 0.85rem;
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

/* —— Focus vibes ——
   Orange ring sits flush on the ink border (no outline-offset gap).
   Pulse = ink shadow + ring brightness, not expanding space. */
.card.focus-primary {
  z-index: 3;
  background: color-mix(in srgb, var(--color-peach) 60%, white);
  outline: none;
  box-shadow:
    var(--shadow-cartoon),
    0 0 0 2px var(--color-accent);
  animation: focus-pulse-strong 1.8s ease-in-out infinite;
}

.card.focus-primary::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.45rem;
  bottom: 0.45rem;
  width: 4px;
  border-radius: 0 3px 3px 0;
  background: var(--color-accent);
  pointer-events: none;
}

.card.focus-secondary {
  z-index: 2;
  background: color-mix(in srgb, var(--color-peach) 38%, white);
  outline: none;
  /* Soft solid ring — same flush trick; dashed outline was creating the ugly gap */
  box-shadow:
    var(--shadow-cartoon),
    0 0 0 2px color-mix(in srgb, var(--color-accent) 72%, var(--color-ink));
  animation: focus-pulse-weak 1.9s ease-in-out infinite;
}

.card.focus-secondary::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55rem;
  bottom: 0.55rem;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: color-mix(in srgb, var(--color-accent) 65%, var(--color-peach));
  pointer-events: none;
  animation: focus-stripe-weak 1.9s ease-in-out infinite;
}

@keyframes focus-pulse-strong {
  0%,
  100% {
    box-shadow:
      var(--shadow-cartoon),
      0 0 0 2px var(--color-accent);
  }
  50% {
    box-shadow:
      4px 4px 0 var(--color-ink),
      0 0 0 2px color-mix(in srgb, var(--color-accent) 85%, white);
  }
}

@keyframes focus-pulse-weak {
  0%,
  100% {
    background: color-mix(in srgb, var(--color-peach) 38%, white);
    box-shadow:
      var(--shadow-cartoon),
      0 0 0 2px color-mix(in srgb, var(--color-accent) 65%, var(--color-ink));
  }
  50% {
    background: color-mix(in srgb, var(--color-peach) 52%, white);
    box-shadow:
      4px 4px 0 var(--color-ink),
      0 0 0 2px var(--color-accent);
  }
}

@keyframes focus-stripe-weak {
  0%,
  100% {
    opacity: 0.7;
    background: color-mix(in srgb, var(--color-accent) 55%, var(--color-peach));
  }
  50% {
    opacity: 1;
    background: color-mix(in srgb, var(--color-accent) 85%, var(--color-peach));
  }
}

/* —— Comic land into Doing —— */
.card.card-land {
  animation: comic-land 0.48s cubic-bezier(0.34, 1.4, 0.64, 1);
}

@keyframes comic-land {
  0% {
    transform: scale(1.1) translateY(-10px) rotate(-2deg);
    box-shadow: var(--shadow-lift);
  }
  35% {
    transform: scale(0.92) translateY(3px) rotate(1deg);
  }
  60% {
    transform: scale(1.04) translateY(-2px) rotate(-0.5deg);
  }
  100% {
    transform: scale(1) translateY(0) rotate(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card.focus-primary,
  .card.focus-secondary,
  .card.focus-secondary::before,
  .focus-stamp.primary,
  .focus-stamp.secondary,
  .card.card-land {
    animation: none;
  }
}
</style>
