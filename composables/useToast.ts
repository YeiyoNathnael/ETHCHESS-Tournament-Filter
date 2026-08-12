import { ref } from 'vue';
import type { ToastMessage } from '~/types/tournament';

const toasts = ref<ToastMessage[]>([]);

export function useToast() {
  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info',
    duration = 4000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, title, message, type, duration };
    toasts.value.push(newToast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  const triggerConfetti = async () => {
    try {
      const confettiModule = await import('canvas-confetti');
      const confetti = confettiModule.default || confettiModule;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00A86B', '#D96B43', '#0F5257', '#FAF7F2', '#FFD700'],
      });
    } catch {
      // Graceful fallback if confetti module fails
    }
  };

  return {
    toasts,
    addToast,
    removeToast,
    triggerConfetti,
  };
}
