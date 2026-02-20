<script lang="ts">
  import { toast } from './index';
</script>

<div class="toast-container">
  {#each $toast as t (t.id)}
    <div class="toast toast-{t.type}" role="alert">
      <span class="toast-message">{t.message}</span>
      <button class="toast-close" onclick={() => toast.dismiss(t.id)} aria-label="Dismiss">×</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 24rem;
  }

  .toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.25rem;
    font-family: 'DM Mono', monospace;
    font-size: 0.875rem;
    animation: slideIn 0.2s ease-out;
  }

  .toast-success {
    background: #1a472a;
    border: 1px solid #22c55e;
    color: #86efac;
  }

  .toast-error {
    background: #450a0a;
    border: 1px solid #ef4444;
    color: #fca5a5;
  }

  .toast-info {
    background: #0c4a6e;
    border: 1px solid #0ea5e9;
    color: #7dd3fc;
  }

  .toast-message {
    flex: 1;
  }

  .toast-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    opacity: 0.7;
    padding: 0;
  }

  .toast-close:hover {
    opacity: 1;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(1rem);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
