import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

const { subscribe, update } = writable<Toast[]>([]);
let idCounter = 0;

function remove(id: number) {
  update((toasts) => toasts.filter((t) => t.id !== id));
}

function add(type: Toast['type'], message: string, duration = 4000) {
  const id = ++idCounter;
  update((toasts) => [...toasts, { id, type, message, duration }]);
  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }
  return id;
}

export const toast = {
  subscribe,
  success: (message: string, duration?: number) => add('success', message, duration),
  error: (message: string, duration?: number) => add('error', message, duration),
  info: (message: string, duration?: number) => add('info', message, duration),
  dismiss: remove,
};
