<script setup lang="ts">
defineProps<{
  message: string
  variant: 'vibe' | 'reject'
  heat?: 1 | 2 | 3
}>()
</script>

<template>
  <aside
    class="banter"
    :class="[variant, heat ? `heat-${heat}` : null]"
    role="status"
    aria-live="polite"
  >
    <span class="banter-tail" aria-hidden="true" />
    <p class="banter-text">{{ message }}</p>
  </aside>
</template>

<style scoped>
.banter {
  position: relative;
  margin: 0;
  padding: 0.55rem 0.7rem 0.55rem 0.75rem;
  border: var(--border-width) solid var(--color-ink);
  border-radius: 10px;
  background: var(--color-surface);
  box-shadow: 2px 2px 0 var(--color-ink);
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.banter-tail {
  position: absolute;
  top: -7px;
  left: 1.1rem;
  width: 10px;
  height: 10px;
  background: inherit;
  border-left: var(--border-width) solid var(--color-ink);
  border-top: var(--border-width) solid var(--color-ink);
  transform: rotate(45deg);
  box-shadow: none;
}

.banter-text {
  margin: 0;
  font-weight: 700;
  font-size: 0.92rem;
  line-height: 1.3;
}

.banter.vibe.heat-1 {
  background: color-mix(in srgb, var(--color-mint) 45%, var(--color-surface));
}

.banter.vibe.heat-2 {
  background: color-mix(in srgb, var(--color-peach) 55%, var(--color-surface));
  box-shadow: 3px 3px 0 var(--color-ink);
}

.banter.vibe.heat-3 {
  background: color-mix(in srgb, var(--color-sky) 50%, var(--color-surface));
}

.banter.reject {
  background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
  animation: banter-pop 0.28s ease-out;
}

@keyframes banter-pop {
  0% {
    transform: translateY(4px) scale(0.96);
    opacity: 0;
  }
  60% {
    transform: translateY(-2px) scale(1.02);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
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
</style>
