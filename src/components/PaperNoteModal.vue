<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useKanbanStore } from '../stores/kanbanStore'
import { playPaperCloseSound, playPaperOpenSound } from '../lib/playPaperSound'

const props = defineProps<{
  cardId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useKanbanStore()
const draftTitle = ref('')
const draftNote = ref('')
const titleRef = ref<HTMLInputElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

function loadDrafts() {
  const card = store.cards[props.cardId]
  draftTitle.value = card?.title ?? ''
  draftNote.value = card?.note ?? ''
}

async function saveAndClose() {
  const title = draftTitle.value.trim()
  if (title) {
    store.updateCard(props.cardId, {
      title,
      note: draftNote.value,
    })
  }
  void playPaperCloseSound()
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    saveAndClose()
  }
}

function onBackdropPointer(e: PointerEvent) {
  if (!panelRef.value) return
  if (e.target instanceof Node && panelRef.value.contains(e.target)) return
  saveAndClose()
}

watch(
  () => props.cardId,
  () => loadDrafts(),
  { immediate: true },
)

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  await playPaperOpenSound()
  await nextTick()
  titleRef.value?.focus()
  // Select title only if short; long notes users often edit body first
  if (draftTitle.value.length < 40) {
    titleRef.value?.select()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="paper-backdrop" role="presentation" @pointerdown="onBackdropPointer">
      <div
        ref="panelRef"
        class="paper-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Card note"
        @pointerdown.stop
      >
        <div class="paper-tape" aria-hidden="true" />
        <p class="paper-label">Scrap note</p>

        <label class="paper-field">
          <span class="paper-field-label">Title</span>
          <input
            ref="titleRef"
            v-model="draftTitle"
            class="paper-title-input"
            type="text"
            maxlength="200"
            placeholder="What’s this card about?"
          />
        </label>

        <label class="paper-field">
          <span class="paper-field-label">Note</span>
          <textarea
            v-model="draftNote"
            class="paper-note-input"
            rows="8"
            maxlength="4000"
            placeholder="Scribble the long version here…"
          />
        </label>

        <div class="paper-actions">
          <button type="button" class="paper-btn paper-btn-done" @click="saveAndClose">
            Done
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.paper-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(45, 42, 38, 0.28);
  animation: paper-fade-in 0.15s ease-out;
}

.paper-sheet {
  position: relative;
  width: min(100%, 28rem);
  max-height: min(85svh, 36rem);
  overflow: auto;
  padding: 1.35rem 1.25rem 1.1rem;
  background: var(--color-paper);
  border: var(--border-width) solid var(--color-ink);
  border-radius: 4px 12px 8px 10px;
  box-shadow: 6px 8px 0 var(--color-ink);
  transform: rotate(-1.1deg);
  background-image: repeating-linear-gradient(
    transparent,
    transparent 1.55rem,
    rgba(45, 42, 38, 0.06) 1.55rem,
    rgba(45, 42, 38, 0.06) calc(1.55rem + 1px)
  );
  animation: paper-pop 0.22s ease-out;
}

.paper-tape {
  position: absolute;
  top: -0.45rem;
  left: 50%;
  width: 4.5rem;
  height: 1.1rem;
  margin-left: -2.25rem;
  background: color-mix(in srgb, var(--color-sky) 70%, white);
  border: 2px solid var(--color-ink);
  border-radius: 2px;
  box-shadow: 1px 1px 0 var(--color-ink);
  transform: rotate(-2deg);
  opacity: 0.95;
}

.paper-label {
  margin: 0.35rem 0 0.85rem;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.paper-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.paper-field-label {
  font-weight: 700;
  font-size: 0.85rem;
}

.paper-title-input,
.paper-note-input {
  width: 100%;
  border: var(--border-width) solid var(--color-ink);
  border-radius: 8px;
  background: var(--color-surface);
  padding: 0.55rem 0.65rem;
  font: inherit;
  font-weight: 700;
  color: var(--color-ink);
  box-shadow: 2px 2px 0 var(--color-ink);
}

.paper-note-input {
  font-weight: 400;
  line-height: 1.45;
  resize: vertical;
  min-height: 9rem;
}

.paper-title-input:focus,
.paper-note-input:focus {
  outline: 3px solid var(--color-accent);
  outline-offset: 1px;
}

.paper-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.paper-btn {
  border: var(--border-width) solid var(--color-ink);
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-weight: 700;
  background: var(--color-surface);
  box-shadow: 2px 2px 0 var(--color-ink);
  cursor: pointer;
}

.paper-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 var(--color-ink);
}

.paper-btn-done {
  background: var(--color-accent);
  color: #fff;
}

.paper-btn-done:hover {
  background: var(--color-accent-hover);
}

@keyframes paper-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes paper-pop {
  0% {
    opacity: 0;
    transform: rotate(-1.1deg) translateY(10px) scale(0.96);
  }
  70% {
    opacity: 1;
    transform: rotate(-0.4deg) translateY(-2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: rotate(-1.1deg) translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper-backdrop,
  .paper-sheet {
    animation: none;
  }
}

@media (max-width: 520px) {
  .paper-sheet {
    transform: none;
    border-radius: 10px;
    width: 100%;
  }
}
</style>
