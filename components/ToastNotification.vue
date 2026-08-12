<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast-fade">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="t.type"
        >
          <div class="toast-icon-wrap">
            <CheckCircle2 v-if="t.type === 'success'" :size="20" class="toast-icon success" />
            <AlertTriangle v-else-if="t.type === 'warning'" :size="20" class="toast-icon warning" />
            <AlertOctagon v-else-if="t.type === 'error'" :size="20" class="toast-icon error" />
            <Info v-else :size="20" class="toast-icon info" />
          </div>

          <div class="toast-body">
            <h4 class="toast-title">{{ t.title }}</h4>
            <p class="toast-msg">{{ t.message }}</p>
          </div>

          <button class="toast-close" @click="removeToast(t.id)">
            <X :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '~/composables/useToast';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-vue-next';

const { toasts, removeToast } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: 420px;
  width: calc(100vw - 3rem);
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  background: var(--color-jade-deep);
  color: white;
  padding: 0.875rem 1rem;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 25px -5px rgba(15, 82, 87, 0.4);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-left: 4px solid var(--color-terracotta);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast.success {
  border-left-color: var(--color-jade-bright);
}

.toast.warning {
  border-left-color: #F59E0B;
}

.toast.error {
  border-left-color: #EF4444;
}

.toast-icon-wrap {
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.toast-icon.success {
  color: var(--color-jade-bright);
}

.toast-icon.warning {
  color: #FBBF24;
}

.toast-icon.error {
  color: #F87171;
}

.toast-icon.info {
  color: var(--color-jade-border);
}

.toast-body {
  flex-grow: 1;
}

.toast-title {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.15rem;
  color: var(--color-cream-accent);
}

.toast-msg {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.35;
}

.toast-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.1rem;
  border-radius: 4px;
}

.toast-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

/* Vue Animations */
.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
</style>
